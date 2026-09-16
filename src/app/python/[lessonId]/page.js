import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getLessonById } from "@/lib/pythonLessons";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";

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

  const description = (
    <article>
      <h1 className="text-2xl font-semibold mb-4">Python: {lesson.title}</h1>
      <MDXRemote source={lesson.content} components={mdxComponents} options={{ mdxOptions }} />
    </article>
  );

  return (
    <CodeWorkspace
      // Resets the editor's internal state when navigating between lessons
      // that share this same route template.
      key={lesson.id}
      accent="amber"
      fileBaseName="main"
      starterCode={lesson.starterCode}
      lockedLanguage={lesson.lockedLanguage}
      description={description}
      backHref="/python"
      backLabel="all lessons"
    />
  );
}