import Link from "next/link";

const BUTTON =
  "mt-4 inline-block rounded-md bg-amber-500 px-5 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

export default function NextLessonLink({ course, nextLesson, heading = "Up next" }) {
  if (!course) return null;

  return (
    <section
      className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800"
      aria-label={nextLesson ? heading : "End of course"}
    >
      {nextLesson ? (
        <>
          <h2 className="text-xl font-semibold">{heading}</h2>
          <p className="mt-3 font-medium">{nextLesson.title}</p>
          {nextLesson.summary && (
            <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{nextLesson.summary}</p>
          )}
          <Link href={`/lessons/${nextLesson.id}`} className={BUTTON}>
            $ next lesson
          </Link>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">End of course</h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            That's the last lesson in {course.title}.
          </p>
          <Link href={`/courses/${course.id}`} className={BUTTON}>
            $ back to course
          </Link>
        </>
      )}
    </section>
  );
}