import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { getAllCourses } from "@/lib/courses";
import { getAllLessons } from "@/lib/lessons";
import { getAllPuzzles } from "@/lib/puzzles";
import LessonCreator from "@/components/creator/LessonCreator";
import PuzzleCreator from "@/components/creator/PuzzleCreator";
import ShaderCreator from "@/components/creator/ShaderCreator";
import CircuitCreator from "@/components/creator/CircuitCreator";
import CodingProjectCreator from "@/components/creator/CodingProjectCreator";
import CourseCreator from "@/components/creator/CourseCreator";

const EDITORS = {
  lesson: LessonCreator,
  puzzle: PuzzleCreator,
  shader: ShaderCreator,
  circuit: CircuitCreator,
  project: CodingProjectCreator,
  course: CourseCreator,
};

// Everything the course editor needs from the published content: every lesson
// (anyone's), plus the course this project was already published as, if any.
function getCourseEditorProps(projectId) {
  const courses = getAllCourses();

  // A lesson can be in several courses; remember which ones have each lesson.
  const coursesOfLesson = new Map();
  for (const course of courses) {
    for (const lessonId of course.lessons) {
      if (!coursesOfLesson.has(lessonId)) coursesOfLesson.set(lessonId, []);
      coursesOfLesson.get(lessonId).push(course);
    }
  }

  const published = courses.find((c) => c.projectId === projectId) ?? null;

  const lessons = [...getAllLessons()]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((lesson) => {
      const others = (coursesOfLesson.get(lesson.id) ?? []).filter((c) => c.id !== published?.id);
      return {
        id: lesson.id,
        title: lesson.title || lesson.id,
        summary: lesson.summary || "",
        available: Boolean(lesson.available),
        // Titles of *other* courses that also contain this lesson (informational).
        alsoIn: others.map((c) => c.title),
      };
    });

  return { lessons, publishedId: published?.id ?? null };
}

// Everything the lesson editor needs: every puzzle (anyone's, any puzzle can be
// linked), plus the lesson this project was already published as, if any.
//
// Only display fields are sent to the browser. getAllPuzzles() already strips
// test cases; we also drop the puzzle body, which the picker doesn't need.
function getLessonEditorProps(projectId) {
  const published = getAllLessons().find((l) => l.projectId === projectId) ?? null;

  const puzzles = getAllPuzzles().map((puzzle) => ({
    id: puzzle.id,
    title: puzzle.title || puzzle.id,
    summary: puzzle.summary || "",
    difficulty: puzzle.difficulty || "",
    // Matches the puzzle page, which treats a missing `available` as coming soon.
    available: Boolean(puzzle.available),
  }));

  return { puzzles, publishedId: published?.id ?? null };
}

function getExtraProps(type, projectId) {
  if (type === "course") return getCourseEditorProps(projectId);
  if (type === "lesson") return getLessonEditorProps(projectId);
  return {};
}

export default async function ProjectEditorPage({ params }) {
  const { type, id } = await params;

  const project = getProject(id);
  if (!project || project.type !== type || !EDITORS[type]) notFound();

  // WIP projects are public for now: anyone with the link can open one, but only the
  // owner can edit (the API enforces this too).
  const session = await auth.api.getSession({ headers: await headers() });
  const canEdit = session?.user?.id === project.userId;

  const Editor = EDITORS[type];
  const extraProps = getExtraProps(type, project.id);

  return (
    <Editor
      key={project.id}
      project={{ id: project.id, title: project.title, data: project.data, canEdit }}
      {...extraProps}
    />
  );
}