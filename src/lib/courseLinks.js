
export function lessonHref(lessonId, courseId) {
  const base = `/lessons/${lessonId}`;
  return courseId ? `${base}?course=${encodeURIComponent(courseId)}` : base;
}

export function puzzleHref(puzzleId, lessonId, courseId) {
  const params = new URLSearchParams();
  if (lessonId) params.set("lesson", lessonId);
  if (courseId) params.set("course", courseId);
  const query = params.toString();
  return `/puzzles/${puzzleId}${query ? `?${query}` : ""}`;
}