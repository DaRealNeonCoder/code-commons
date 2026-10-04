import { getCourseById, getCoursesForLesson } from "@/lib/courses";
import { getLesson, getLessonsByIds } from "@/lib/lessonStore";
import { getLinkedPuzzles, LESSON_ID_PATTERN } from "@/lib/lessonPuzzles";

// Display-only snapshot of a course: lessons in order, each with its puzzle chain.
// (async: lessons may live in the database; they're fetched in one query)
export async function getCourseOutline(courseId) {
  const course = getCourseById(courseId);
  if (!course) return null;

  const byId = await getLessonsByIds(course.lessons);

  const lessons = course.lessons
    .map((lessonId) => byId.get(lessonId))
    .filter(Boolean)
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title || lesson.id,
      summary: lesson.summary || "",
      available: Boolean(lesson.available),
      puzzles: getLinkedPuzzles(lesson.puzzles).map(({ id, title, available }) => ({
        id,
        title,
        available,
      })),
    }));

  return { id: course.id, title: course.title, lessons };
}

// The first published lesson after `lessonId`, skipping "coming soon" ones.
export function getNextLessonInOutline(outline, lessonId) {
  const index = outline.lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) return null;
  return outline.lessons.slice(index + 1).find((l) => l.available) ?? null;
}

// Everything a lesson/puzzle page needs to behave as part of a course, or null
// when the lesson isn't in a course (or, for puzzles, when the puzzle isn't in
// that lesson's chain).
//
// A lesson can be in several courses. `courseId` (from ?course=) says which one
// the reader is following. It is only compared against the courses that really
// contain the lesson, so a stale or made-up value is ignored and we fall back to
// the first course that has it.
export async function getCourseContext(lessonId, puzzleId = null, courseId = null) {
  if (typeof lessonId !== "string" || !LESSON_ID_PATTERN.test(lessonId)) return null;
  const lesson = await getLesson(lessonId);
  if (!lesson) return null;

  if (puzzleId && !getLinkedPuzzles(lesson.puzzles).some((p) => p.id === puzzleId)) return null;

  const candidates = getCoursesForLesson(lessonId);
  if (candidates.length === 0) return null;
  const course =
    (typeof courseId === "string" && candidates.find((c) => c.id === courseId)) || candidates[0];

  const outline = await getCourseOutline(course.id);
  if (!outline) return null;

  return { outline, nextLesson: getNextLessonInOutline(outline, lessonId) };
}
