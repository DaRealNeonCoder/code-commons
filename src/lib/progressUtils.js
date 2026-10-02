export function isLessonComplete(progress, lessonId, availablePuzzleIds) {
  if (availablePuzzleIds.length === 0) return progress.lessons.has(lessonId);
  return availablePuzzleIds.every((id) => progress.puzzles.has(id));
}