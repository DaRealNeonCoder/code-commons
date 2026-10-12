import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLesson, getLessons } from "@/lib/lessonStore";
import { getCourseContext } from "@/lib/courseNav";
import { getLinkedPuzzles } from "@/lib/lessonPuzzles";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import NextPuzzleLinks from "@/components/NextPuzzleLinks";
import NextLessonLink from "@/components/NextLessonLink";
import CourseShell from "@/components/CourseShell";
import CompleteOnView from "@/components/CompleteOnView";
import AITutor from "@/components/AITutor";
import ContentAuthor from "@/components/ContentAuthor";
import DeferredEngagement from "@/components/DeferredEngagement";
import { absoluteUrl, jsonLd, pageDescription } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getLessons()).map((lesson) => ({ lessonId: lesson.id }));
}

export async function generateMetadata({ params }) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (!lesson) return {};
  const description = pageDescription(lesson.summary, `${lesson.title} explained with examples and practice on CodeCommons.`);
  return {
    title: `${lesson.title} | CodeCommons`,
    description,
    alternates: { canonical: absoluteUrl(`/lessons/${lesson.id}`) },
    openGraph: { title: lesson.title, description, type: "article", url: absoluteUrl(`/lessons/${lesson.id}`) },
  };
}

export default async function LessonPage({ params }) {
  const { lessonId } = await params;
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
  // Lesson URLs are canonical and statically generated. A lesson can belong to
  // multiple courses, but the first published course is a stable public context;
  // course-specific navigation still links directly to the course page.
  const ctx = await getCourseContext(lesson.id);
  const course = ctx?.outline ?? null;

  const progress = course ? { puzzles: new Set(), lessons: new Set() } : null;

  const firstPuzzle = (await getLinkedPuzzles(lesson.puzzles)).find((x) => x.available);
  const lessonNumber = course
    ? String(course.lessons.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0")
    : null;
  const isFirstLesson = Boolean(course && course.lessons[0]?.id === lesson.id);

  const lessonSchema = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: lesson.title,
    headline: lesson.title,
    description: lesson.summary,
    url: absoluteUrl(`/lessons/${lesson.id}`),
    learningResourceType: "Lesson",
    educationalLevel: lesson.difficulty,
    isPartOf: course
      ? { "@type": "Course", name: course.title, url: absoluteUrl(`/courses/${course.id}`) }
      : undefined,
    author: { "@type": "Organization", name: "CodeCommons", url: absoluteUrl("/") },
  };

  return (
    <CourseShell outline={course} progress={progress} lessonId={lesson.id}>
      <DeferredEngagement itemType="lesson" itemId={lesson.id} showComments={false} />
        <div className="min-h-0 w-full flex-1 overflow-y-auto bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-8 sm:py-12">
          <div className="mx-auto max-w-4xl">
            <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(lessonSchema)} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
              <Link href="/browse" className="text-amber-700 hover:underline dark:text-amber-400">
                browse
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <span>{lessonNumber ? `lesson ${lessonNumber}` : "learning lesson"}</span>
            </div>

            <header className="mt-5 max-w-3xl">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">{course?.title || "CodeCommons lesson"}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">{lesson.title}</h1>
              {lesson.summary && <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">{lesson.summary}</p>}
            </header>

            {isFirstLesson && (
              <section className="mt-7 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-teal-50 shadow-sm dark:border-amber-900/70 dark:from-amber-950/40 dark:to-teal-950/30">
                <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">your first win</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">See your code do something.</h2>
                    <p className="mt-2 max-w-xl leading-7 text-zinc-700 dark:text-zinc-300">
                      Read the one-line example, change the message, and run it. Then use the first puzzle to print a greeting of your own.
                    </p>
                    {firstPuzzle && (
                      <Link
                        href={`/puzzles/${firstPuzzle.id}?lesson=${encodeURIComponent(lesson.id)}${course ? `&course=${encodeURIComponent(course.id)}` : ""}`}
                        className="mt-5 inline-flex items-center rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      >
                        Open the first puzzle <span aria-hidden="true" className="ml-2 text-base">→</span>
                      </Link>
                    )}
                  </div>
                  <pre className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 font-mono text-sm leading-7 shadow-lg"><code><span className="text-amber-300">print</span><span className="text-zinc-400">(</span><span className="text-teal-300">&quot;Hello, World!&quot;</span><span className="text-zinc-400">)</span>{"\n"}<span className="text-green-400">Hello, World!</span></code></pre>
                </div>
              </section>
            )}

            <article className="mt-8 max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
              <MDXRemote source={lesson.content} components={mdxComponents} options={{ mdxOptions }} />
            </article>

            {!isFirstLesson && (
              <NextPuzzleLinks
                puzzle={firstPuzzle}
                lessonId={lesson.id}
                courseId={course?.id}
                heading="Ready to practice?"
                buttonLabel="Start the first puzzle →"
                accent="amber"
              />
            )}

            {/* A course lesson with no puzzles: reading it completes it. */}
            {course && <NextLessonLink course={course} nextLesson={ctx.nextLesson} />}
            {course && !firstPuzzle && <CompleteOnView lessonId={lesson.id} />}
            <DeferredEngagement itemType="lesson" itemId={lesson.id} showRating={false} />
            <ContentAuthor itemType="lesson" itemId={lesson.id} />
          </div>
          <AITutor
            lessonContent={lesson.content}
            language="lesson"
            contextType="lesson"
            contextTitle={lesson.title}
          />
        </div>
    </CourseShell>
  );
}
