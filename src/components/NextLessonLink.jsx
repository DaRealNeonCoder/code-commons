import Link from "next/link";

const BUTTON =
  "mt-5 inline-flex items-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

export default function NextLessonLink({ course, nextLesson, heading = "Up next" }) {
  if (!course) return null;

  return (
    <section
      className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/30 sm:p-6"
      aria-label={nextLesson ? heading : "End of course"}
    >
      {nextLesson ? (
        <>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">{heading}</p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">{nextLesson.title}</h2>
            {nextLesson.summary && <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{nextLesson.summary}</p>}
            <Link href={`/lessons/${nextLesson.id}?course=${encodeURIComponent(course.id)}`} className={BUTTON}>
              Next lesson <span aria-hidden="true" className="ml-2 text-base">→</span>
            </Link>
        </>
      ) : (
        <>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">End of course</p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">You made it to the end.</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              That&apos;s the last lesson in {course.title}.
            </p>
            <Link href={`/courses/${course.id}`} className={BUTTON}>
              Back to course <span aria-hidden="true" className="ml-2 text-base">→</span>
          </Link>
        </>
      )}
    </section>
  );
}
