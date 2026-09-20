import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/courses";
import { getLessonById } from "@/lib/lessons";

export default async function CoursePage({ params }) {
  const { courseId } = await params;
  const course = getCourseById(courseId);
  if (!course) notFound();

  const lessons = course.lessons.map((lessonId) => getLessonById(lessonId)).filter(Boolean);

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/lessons" className="font-mono text-sm text-amber-600 hover:underline dark:text-amber-400">
          ← /lessons
        </Link>
        <p className="mt-3 font-mono text-sm text-amber-600 dark:text-amber-400">course</p>
        <h1 className="mt-1 text-2xl font-semibold">{course.title}</h1>
        {course.summary && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{course.summary}</p>}

        <ol className="mt-8 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {lessons.map((lesson, i) => (
            <li key={lesson.id}>
              {lesson.available ? (
                <Link
                  href={`/lessons/${lesson.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-amber-50 dark:hover:bg-zinc-900"
                >
                  <span className="mt-0.5 font-mono text-sm text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    {lesson.summary && <p className="text-sm text-zinc-500">{lesson.summary}</p>}
                  </div>
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3.5 text-zinc-400 dark:text-zinc-600">
                  <span className="mt-0.5 font-mono text-sm">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-medium">
                      {lesson.title} <span className="font-mono text-xs"># coming soon</span>
                    </p>
                    {lesson.summary && <p className="text-sm">{lesson.summary}</p>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}