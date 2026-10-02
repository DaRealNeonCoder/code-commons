import { isCompleted } from "@/lib/progress";

// Which of a course's puzzles (and puzzle-less lessons) this user has completed.
export async function getCourseProgress(userId, outline) {
  const puzzles = new Set();
  const lessons = new Set();
  if (!userId || !outline) return { puzzles: [], lessons: [] };

  for (const lesson of outline.lessons) {
    if (!lesson.available) continue;
    const available = lesson.puzzles.filter((p) => p.available);

    for (const p of available) {
      if (!puzzles.has(p.id) && (await isCompleted(userId, "puzzle", p.id))) puzzles.add(p.id);
    }
    if (available.length === 0 && (await isCompleted(userId, "lesson", lesson.id))) {
      lessons.add(lesson.id);
    }
  }
  return { puzzles: [...puzzles], lessons: [...lessons] };
}