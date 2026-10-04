import { cache } from "react";
import { getCompletedIds } from "@/lib/progress";

// One pair of queries per user per request, no matter how many courses the page
// asks about (the profile page asks about every course).
const completedFor = cache(async (userId) => {
  const [puzzles, lessons] = await Promise.all([
    getCompletedIds(userId, "puzzle"),
    getCompletedIds(userId, "lesson"),
  ]);
  return { puzzles: new Set(puzzles), lessons: new Set(lessons) };
});

// Which of a course's puzzles (and puzzle-less lessons) this user has completed.
export async function getCourseProgress(userId, outline) {
  const puzzles = new Set();
  const lessons = new Set();
  if (!userId || !outline) return { puzzles: [], lessons: [] };

  const done = await completedFor(userId);

  for (const lesson of outline.lessons) {
    if (!lesson.available) continue;
    const available = lesson.puzzles.filter((p) => p.available);

    for (const p of available) {
      if (done.puzzles.has(p.id)) puzzles.add(p.id);
    }
    if (available.length === 0 && done.lessons.has(lesson.id)) {
      lessons.add(lesson.id);
    }
  }
  return { puzzles: [...puzzles], lessons: [...lessons] };
}
