import CourseSidebar from "@/components/CourseSidebar";

export default function CourseShell({ outline, progress, lessonId, puzzleId = null, puzzleType = "puzzle", children }) {
  if (!outline) return children;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <CourseSidebar
        outline={outline}
        progress={progress}
        currentLessonId={lessonId}
        currentPuzzleId={puzzleId}
        currentPuzzleType={puzzleType}
      />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
