import { getCourseById, getCourseForLesson } from "@/lib/courses";
import { getLessonById } from "@/lib/lessons";
import { getLinkedPuzzles, LESSON_ID_PATTERN } from "@/lib/lessonPuzzles";

// Display-only snapshot of a course: lessons in order, each with its puzzle chain.
export function getCourseOutline(courseId) {
  const course = getCourseById(courseId);
  if (!course) return null;

  const lessons = course.lessons
    .map((lessonId) => getLessonById(lessonId))
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
export function getCourseContext(lessonId, puzzleId = null) {
  if (typeof lessonId !== "string" || !LESSON_ID_PATTERN.test(lessonId)) return null;
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;

  if (puzzleId && !getLinkedPuzzles(lesson.puzzles).some((p) => p.id === puzzleId)) return null;

  const course = getCourseForLesson(lessonId);
  if (!course) return null;
  const outline = getCourseOutline(course.id);
  if (!outline) return null;

  return { outline, nextLesson: getNextLessonInOutline(outline, lessonId) };
}