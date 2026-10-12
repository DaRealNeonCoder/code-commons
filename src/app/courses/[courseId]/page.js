import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/courses";
import { getCourseOutline } from "@/lib/courseNav";
import { getCurrentUserId } from "@/lib/session";
import { getCourseProgress } from "@/lib/courseProgress";
import { isLessonComplete } from "@/lib/progressUtils";
import RatedShell from "@/components/rating/RatedShell";
import CommentSection from "@/components/comments/CommentSection";
import ContentAuthor from "@/components/ContentAuthor";

export default async function CoursePage({ params }) {
  const { courseId } = await params;
  const course = await getCourseById(courseId);
  const outline = await getCourseOutline(courseId);
  if (!course || !outline) notFound();

  const userId = await getCurrentUserId();
  const raw = await getCourseProgress(userId, outline);
  const progress = { puzzles: new Set(raw.puzzles), lessons: new Set(raw.lessons) };
  const availableLessons = outline.lessons.filter((lesson) => lesson.available);
  const puzzleCount = availableLessons.reduce(
    (total, lesson) => total + lesson.puzzles.filter((puzzle) => puzzle.available).length,
    0
  );
  const lessonStates = outline.lessons.map((lesson) => ({
    lesson,
    availablePuzzleIds: lesson.puzzles.filter((puzzle) => puzzle.available).map((puzzle) => puzzle.id),
  }));
  const completedLessons = lessonStates.filter(({ lesson, availablePuzzleIds }) =>
    lesson.available && isLessonComplete(progress, lesson.id, availablePuzzleIds)
  ).length;
  const nextLesson = lessonStates.find(
    ({ lesson, availablePuzzleIds }) =>
      lesson.available && !isLessonComplete(progress, lesson.id, availablePuzzleIds)
  )?.lesson ?? null;
  const firstLesson = availableLessons[0] ?? null;
  const focusLesson = nextLesson ?? firstLesson;
  const focusLessonIsFirst = focusLesson?.id === firstLesson?.id;
  const focusPuzzleCount = focusLesson?.puzzles.filter((puzzle) => puzzle.available).length ?? 0;
  const courseComplete = availableLessons.length > 0 && completedLessons === availableLessons.length;
  const progressPercent = availableLessons.length
    ? Math.round((completedLessons / availableLessons.length) * 100)
    : 0;

  return (
    <RatedShell itemType="course" itemId={course.id}>
      <div className="min-h-0 w-full flex-1 overflow-y-auto bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
           <Link href="/browse" className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-amber-700 hover:underline dark:text-amber-400">
             ← browse
          </Link>

           <section className="mt-5 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-teal-50 shadow-sm dark:border-amber-900/70 dark:from-amber-950/40 dark:via-zinc-900 dark:to-teal-950/30">
             <div className="p-6 sm:p-8">
               <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
                 <span>course</span>
                 <span className="text-zinc-300 dark:text-zinc-700">/</span>
                 <span>python</span>
               </div>
               <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">{course.title}</h1>
               {course.summary && <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300 sm:text-lg">{course.summary}</p>}

               <div className="mt-7 grid gap-4 border-t border-amber-200/80 pt-6 dark:border-amber-900/60 sm:grid-cols-[1fr_auto] sm:items-end">
                 <div>
                   <div className="flex items-center justify-between gap-4 text-sm">
                     <span className="font-medium text-zinc-700 dark:text-zinc-200">Your progress</span>
                     <span className="font-mono text-xs text-zinc-500">{completedLessons}/{availableLessons.length} lessons</span>
                   </div>
                   <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-zinc-800" aria-label={`${progressPercent}% complete`} role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                     <div className="h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${progressPercent}%` }} />
                   </div>
                   <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-zinc-500">
                     <span>{availableLessons.length} lessons</span>
                     <span>{puzzleCount} practice puzzles</span>
                   </div>
                 </div>
                 {focusLesson && (
                   <Link
                     href={`/lessons/${focusLesson.id}?course=${encodeURIComponent(course.id)}`}
                     className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                   >
                     {courseComplete ? "Review the first lesson" : focusLessonIsFirst ? "Start learning" : "Continue learning"}
                     <span aria-hidden="true" className="ml-2 text-base">→</span>
                   </Link>
                 )}
                 {courseComplete && !focusLesson && (
                   <span className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                     Course complete ✓
                   </span>
                 )}
               </div>

               {focusLesson && (
                 <div className="mt-8 grid gap-6 border-t border-amber-200/80 pt-8 dark:border-amber-900/60 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                 <div>
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
                    {courseComplete ? "nice work" : focusLessonIsFirst ? "your first win" : "keep your momentum"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                    {courseComplete
                      ? "You made it through the course."
                      : focusLessonIsFirst
                        ? "Make your first Python program."
                        : `Next up: ${focusLesson.title}`}
                  </h2>
                  <p className="mt-3 max-w-xl leading-7 text-zinc-700 dark:text-zinc-300">
                    {courseComplete
                      ? "Revisit any lesson, or start another pass to sharpen what you learned."
                      : focusLessonIsFirst
                        ? "Run one line of code, see the result immediately, and turn that first success into a tiny challenge."
                        : focusLesson.summary || "Pick up where you left off with the next short lesson."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="rounded-full border border-amber-200 bg-white/70 px-2.5 py-1 dark:border-amber-900 dark:bg-zinc-900/70">
                      {focusPuzzleCount > 0
                        ? `${focusPuzzleCount} practice ${focusPuzzleCount === 1 ? "puzzle" : "puzzles"}`
                        : "reading lesson"}
                    </span>
                    <span className="rounded-full border border-teal-200 bg-white/70 px-2.5 py-1 dark:border-teal-900 dark:bg-zinc-900/70">
                      runs in your browser
                    </span>
                  </div>

                 </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-lg">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
                    <span className="font-mono text-xs text-zinc-400">{focusLessonIsFirst ? "first_program.py" : "next_step.py"}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-teal-400">ready</span>
                  </div>
                  <pre className="overflow-x-auto p-5 font-mono text-sm leading-7"><code><span className="text-amber-300">print</span><span className="text-zinc-400">(</span><span className="text-teal-300">&quot;Hello, World!&quot;</span><span className="text-zinc-400">)</span>{"\n\n"}<span className="text-zinc-500"># output</span>{"\n"}<span className="text-green-400">Hello, World!</span></code></pre>
                </div>
                 </div>
               )}
             </div>
           </section>

          <div className="mt-10 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">The path</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Learn one idea at a time</h2>
            </div>
            <span className="hidden font-mono text-xs text-zinc-500 sm:block">{availableLessons.length} steps</span>
          </div>

          <ol className="mt-5 grid gap-3">
            {outline.lessons.map((lesson, i) => {
              const number = String(i + 1).padStart(2, "0");
              const availableIds = lesson.puzzles.filter((p) => p.available).map((p) => p.id);
              const done = lesson.available && isLessonComplete(progress, lesson.id, availableIds);

              if (!lesson.available) {
                return (
                  <li key={lesson.id} className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-100/70 p-5 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600 sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-sm">{number}</span>
                      <div>
                        <p className="font-semibold">{lesson.title}</p>
                        {lesson.summary && <p className="mt-1 text-sm">{lesson.summary}</p>}
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em]">coming soon</p>
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/lessons/${lesson.id}?course=${encodeURIComponent(course.id)}`}
                    className="group flex min-h-32 items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-700 sm:gap-6 sm:p-6"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm ${done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"}`} aria-label={done ? "completed" : `lesson ${number}`}>
                      {done ? "✓" : number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-zinc-950 dark:text-white">{lesson.title}</h3>
                        {i === 0 && !done && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300">start here</span>}
                      </div>
                      {lesson.summary && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{lesson.summary}</p>}
                      <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-xs text-zinc-500">
                        <span>{availableIds.length ? `${availableIds.length} practice ${availableIds.length === 1 ? "puzzle" : "puzzles"}` : "reading lesson"}</span>
                        {done && <span className="text-emerald-600 dark:text-emerald-400">complete</span>}
                      </div>
                    </div>
                    <span className="mt-1 text-xl text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-amber-500 dark:text-zinc-700" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ol>
           <CommentSection itemType="course" itemId={course.id} />
           <ContentAuthor itemType="course" itemId={course.id} />
        </div>
      </div>
    </RatedShell>
  );
}
