import { getCourseById, getCoursesForLesson } from "@/lib/courses";
import { getLesson, getLessonsByIds } from "@/lib/lessonStore";
import { getPuzzleChoicesByRefs } from "@/lib/puzzleChoices";
import { puzzleHref } from "@/lib/puzzleRefs";
import {
  getLinkedPuzzles,
  normalizePuzzleIds,
  resolveLinkedPuzzles,
  LESSON_ID_PATTERN,
} from "@/lib/lessonPuzzles";

// Display-only snapshot of a course: lessons in order, each with its typed
// puzzle chain. Puzzle refs can point at puzzle, shader, or circuit tables.
export async function getCourseOutline(courseId) {
  const course = await getCourseById(courseId);
  if (!course) return null;

  const byId = await getLessonsByIds(course.lessons);
  const lessons = course.lessons.map((id) => byId.get(id)).filter(Boolean);

  const puzzleRefs = [...new Set(lessons.flatMap((l) => normalizePuzzleIds(l.puzzles)))];
  const puzzlesByRef = await getPuzzleChoicesByRefs(puzzleRefs);

  return {
    id: course.id,
    title: course.title,
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title || lesson.id,
      summary: lesson.summary || "",
      available: Boolean(lesson.available),
      puzzles: resolveLinkedPuzzles(lesson.puzzles, puzzlesByRef).map(({ ref, id, type, typeLabel, title, available }) => ({
        ref,
        id,
        type,
        typeLabel,
        title,
        available,
        href: puzzleHref(ref),
      })),
    })),
  };
}

// The first published lesson after `lessonId`, skipping "coming soon" ones.
export function getNextLessonInOutline(outline, lessonId) {
  const index = outline.lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) return null;
  return outline.lessons.slice(index + 1).find((l) => l.available) ?? null;
}

// Everything a lesson/puzzle page needs to behave as part of a course, or null.
// `courseId` (from ?course=) is only compared against courses that really
// contain the lesson, so a stale or made-up value falls back to the first one.
export async function getCourseContext(lessonId, puzzleId = null, courseId = null, puzzleType = "puzzle") {
  if (typeof lessonId !== "string" || !LESSON_ID_PATTERN.test(lessonId)) return null;
  const lesson = await getLesson(lessonId);
  if (!lesson) return null;

  if (puzzleId && !(await getLinkedPuzzles(lesson.puzzles)).some((p) => p.id === puzzleId && p.type === puzzleType)) return null;

  const candidates = await getCoursesForLesson(lessonId);
  if (candidates.length === 0) return null;
  const course =
    (typeof courseId === "string" && candidates.find((c) => c.id === courseId)) || candidates[0];

  const outline = await getCourseOutline(course.id);
  if (!outline) return null;

  return { outline, nextLesson: getNextLessonInOutline(outline, lessonId) };
}
