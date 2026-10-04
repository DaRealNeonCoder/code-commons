import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { getAllCourses } from "@/lib/courses";
import { getLessons, getLessonByProjectId } from "@/lib/lessonStore";
import { getAllPuzzles } from "@/lib/puzzles";
import LessonCreator from "@/components/creator/LessonCreator";
import PuzzleCreator from "@/components/creator/PuzzleCreator";
import ShaderCreator from "@/components/creator/ShaderCreator";
import CircuitCreator from "@/components/creator/CircuitCreator";
import BuildCreator from "@/components/creator/BuildCreator";
import CourseCreator from "@/components/creator/CourseCreator";

const EDITORS = {
  lesson: LessonCreator,
  puzzle: PuzzleCreator,
  shader: ShaderCreator,
  circuit: CircuitCreator,
  project: BuildCreator, // "coding project" type id is unchanged; BuildCreator replaces CodingProjectCreator
  course: CourseCreator,
};

// Everything the course editor needs from the published content: every lesson
// (anyone's, official or user-made), plus the course this project was already
// published as, if any.
async function getCourseEditorProps(projectId) {
  const courses = await getAllCourses();

  // A lesson can be in several courses; remember which ones have each lesson.
  const coursesOfLesson = new Map();
  for (const course of courses) {
    for (const lessonId of course.lessons) {
      if (!coursesOfLesson.has(lessonId)) coursesOfLesson.set(lessonId, []);
      coursesOfLesson.get(lessonId).push(course);
    }
  }

  const published = courses.find((c) => c.projectId === projectId) ?? null;

  const lessons = (await getLessons()).map((lesson) => {
    const others = (coursesOfLesson.get(lesson.id) ?? []).filter((c) => c.id !== published?.id);
    return {
      id: lesson.id,
      title: lesson.title || lesson.id,
      summary: lesson.summary || "",
      available: Boolean(lesson.available),
      alsoIn: others.map((c) => c.title),
    };
  });

  return { lessons, publishedId: published?.id ?? null };
}

// Everything the lesson editor needs: every puzzle (any puzzle can be linked),
// plus the lesson this project was already published as, if any. Only display
// fields are sent to the browser (getAllPuzzles never selects test cases).
async function getLessonEditorProps(projectId) {
  const published = await getLessonByProjectId(projectId);

  const puzzles = (await getAllPuzzles()).map((puzzle) => ({
    id: puzzle.id,
    title: puzzle.title || puzzle.id,
    summary: puzzle.summary || "",
    difficulty: puzzle.difficulty || "",
    available: Boolean(puzzle.available),
  }));

  return { puzzles, publishedId: published?.id ?? null };
}

async function getExtraProps(type, projectId) {
  if (type === "course") return getCourseEditorProps(projectId);
  if (type === "lesson") return getLessonEditorProps(projectId);
  return {};
}

export default async function ProjectEditorPage({ params }) {
  const { type, id } = await params;

  const project = await getProject(id);
  if (!project || project.type !== type || !EDITORS[type]) notFound();

  // WIP projects are viewable by link, but only the owner can edit (the API enforces this too).
  const session = await auth.api.getSession({ headers: await headers() });
  const canEdit = session?.user?.id === project.userId;

  const Editor = EDITORS[type];
  const extraProps = await getExtraProps(type, project.id);

  return (
    <Editor
      key={project.id}
      project={{ id: project.id, title: project.title, data: project.data, canEdit }}
      {...extraProps}
    />
  );
}
