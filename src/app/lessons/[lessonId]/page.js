import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLesson } from "@/lib/lessonStore";
import { getCourseContext } from "@/lib/courseNav";
import { getLinkedPuzzles } from "@/lib/lessonPuzzles";
import { getCurrentUserId } from "@/lib/session";
import { getCourseProgress } from "@/lib/courseProgress";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import NextPuzzleLinks from "@/components/NextPuzzleLinks";
import NextLessonLink from "@/components/NextLessonLink";
import CourseShell from "@/components/CourseShell";
import CompleteOnView from "@/components/CompleteOnView";
import RatedShell from "@/components/rating/RatedShell";
import CommentSection from "@/components/comments/CommentSection";

export default async function LessonPage({ params, searchParams }) {
  const { lessonId } = await params;
  const query = await searchParams;
  const lesson = await getLesson(lessonId);
  if (!lesson) notFound();

  if (!lesson.available) {
    return (
      <div className="flex w-full h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="font-mono text-sm text-zinc-400">{lesson.title}</p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">This lesson is coming soon.</p>
        </div>
      </div>
    );
  }

  // The lesson may be in several courses; ?course= says which one the reader
  // came from. getCourseContext ignores it unless that course has this lesson.
  const requestedCourseId = typeof query?.course === "string" ? query.course : null;
  const ctx = await getCourseContext(lesson.id, null, requestedCourseId);
  const course = ctx?.outline ?? null;

  const userId = course ? await getCurrentUserId() : null;
  const progress = course ? await getCourseProgress(userId, course) : null;

  const firstPuzzle = (await getLinkedPuzzles(lesson.puzzles)).find((x) => x.available);
  const lessonNumber = course
    ? String(course.lessons.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0")
    : null;

  return (
    <CourseShell outline={course} progress={progress} lessonId={lesson.id}>
      <RatedShell itemType="lesson" itemId={lesson.id}>
        <div className="min-h-0 w-full flex-1 overflow-y-auto bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Link href={course ? `/courses/${course.id}` : "/lessons"} className="text-amber-700 hover:underline dark:text-amber-400">
                {course ? course.title : "all lessons"}
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <span>{lessonNumber ? `lesson ${lessonNumber}` : "python lesson"}</span>
            </div>

            <header className="mt-5 max-w-3xl">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Python fundamentals</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">{lesson.title}</h1>
              {lesson.summary && <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">{lesson.summary}</p>}
            </header>

            <article className="mt-8 max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
              <MDXRemote source={lesson.content} components={mdxComponents} options={{ mdxOptions }} />
            </article>

            <NextPuzzleLinks
              puzzle={firstPuzzle}
              lessonId={lesson.id}
              courseId={course?.id}
              heading="Ready to practice?"
              buttonLabel="Start the first puzzle →"
              accent="amber"
            />

            {/* A course lesson with no puzzles: reading it completes it. */}
            {course && !firstPuzzle && (
              <>
                <NextLessonLink course={course} nextLesson={ctx.nextLesson} />
                {userId && !progress.lessons.includes(lesson.id) && <CompleteOnView lessonId={lesson.id} />}
              </>
            )}
            <CommentSection itemType="lesson" itemId={lesson.id} />
          </div>
        </div>
      </RatedShell>
    </CourseShell>
  );
}
