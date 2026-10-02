import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLessonById } from "@/lib/lessons";
import { getCourseContext } from "@/lib/courseNav";
import { getLinkedPuzzles } from "@/lib/lessonPuzzles";
import { getCurrentUserId } from "@/lib/session";
import { getCourseProgress } from "@/lib/courseProgress";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import NextPuzzleLinks from "@/components/NextPuzzleLinks";
import NextLessonLink from "@/components/NextLessonLink";
import CourseShell from "@/components/CourseShell";
import CompleteOnView from "@/components/CompleteOnView";

export default async function LessonPage({ params }) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
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

  const ctx = getCourseContext(lesson.id);
  const course = ctx?.outline ?? null;

  const userId = course ? await getCurrentUserId() : null;
  const progress = course ? await getCourseProgress(userId, course) : null;

  const firstPuzzle = getLinkedPuzzles(lesson.puzzles).find((x) => x.available);

  return (
    <CourseShell outline={course} progress={progress} lessonId={lesson.id}>
      <div className="w-full h-full overflow-y-auto px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Link href="/lessons" className="font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            ← all lessons
          </Link>

          <article className="mt-4">
            {course && (
              <Link
                href={`/courses/${course.id}`}
                className="mb-3 inline-block font-mono text-xs text-amber-600 hover:underline dark:text-amber-400"
              >
                part of {course.title}
              </Link>
            )}
            <h1 className="text-2xl font-semibold mb-4">Python: {lesson.title}</h1>
            <MDXRemote source={lesson.content} components={mdxComponents} options={{ mdxOptions }} />
          </article>

          <NextPuzzleLinks
            puzzle={firstPuzzle}
            lessonId={lesson.id}
            heading="Ready to practice?"
            buttonLabel="$ next: start the puzzle"
            accent="amber"
          />

          {/* A course lesson with no puzzles: reading it completes it. */}
          {course && !firstPuzzle && (
            <>
              <NextLessonLink course={course} nextLesson={ctx.nextLesson} />
              {userId && !progress.lessons.includes(lesson.id) && <CompleteOnView lessonId={lesson.id} />}
            </>
          )}
        </div>
      </div>
    </CourseShell>
  );
}