import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLessonById } from "@/lib/lessons";
import { getCourseForLesson } from "@/lib/courses";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";

export default async function LessonPage({ params }) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
  if (!lesson) notFound();

  const course = getCourseForLesson(lessonId);

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

  const description = (
    <article>
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
  );

  return (
    <CodeWorkspace
      accent="amber"
      fileName="main.py"
      starterCode={lesson.starterCode}
      description={description}
      backHref="/lessons"
      backLabel="all lessons"
    />
  );
}