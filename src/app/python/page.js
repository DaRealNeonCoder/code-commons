import Link from "next/link";
import { getAllLessons } from "@/lib/pythonLessons";

export default function PythonLessonsPage() {
  const pythonLessons = getAllLessons();

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-amber-600 dark:text-amber-400">/python</p>
        <h1 className="mt-1 text-2xl font-semibold">Lessons</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Pick a lesson to get started.</p>

        <div className="mt-8 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {pythonLessons.map((lesson) => {
            const number = String(lesson.order).padStart(2, "0");
            const fileName = `${number}_${lesson.id.replace(/-/g, "_")}.py`;

            return lesson.available ? (
              <Link
                key={lesson.id}
                href={`/python/${lesson.id}`}
                className="flex flex-col gap-0.5 px-4 py-3.5 transition-colors hover:bg-amber-50 dark:hover:bg-zinc-900"
              >
                <span className="font-mono text-sm">{fileName}</span>
                <span className="text-sm text-zinc-500">{lesson.summary}</span>
              </Link>
            ) : (
              <div
                key={lesson.id}
                className="flex cursor-not-allowed flex-col gap-0.5 px-4 py-3.5 text-zinc-400 dark:text-zinc-600"
              >
                <span className="font-mono text-sm">
                  {fileName} <span className="text-zinc-300 dark:text-zinc-700"># coming soon</span>
                </span>
                <span className="text-sm">{lesson.summary}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}