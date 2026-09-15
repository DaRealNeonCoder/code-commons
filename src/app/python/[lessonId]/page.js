import { notFound } from "next/navigation";
import { getLessonById } from "@/lib/pythonLessons";
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
    <>
      <h1 className="text-2xl font-semibold mb-4">Python: {lesson.title}</h1>
      {lesson.description.map((paragraph, i) => (
        <p key={i} className="mb-4">
          {paragraph}
        </p>
      ))}
      <pre className="bg-black text-white rounded p-3 text-sm">
        <code>{lesson.starterCode}</code>
      </pre>
      <p className="mt-4">Edit the code on the right, then click Run.</p>
    </>
  );

  return (
    <CodeWorkspace
      accent="amber"
      fileName="main.py"
      starterCode={lesson.starterCode}
      description={description}
      backHref="/python"
      backLabel="all lessons"
    />
  );
}