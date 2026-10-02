"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import ProjectBar from "@/components/creator/ProjectBar";

const smallButton =
  "rounded border border-zinc-300 px-2.5 py-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 disabled:opacity-40 dark:border-zinc-700 dark:hover:text-zinc-200";

// `lessons` (every published lesson) and `publishedId` (the course this project
// was last published as) are computed on the server in the editor page.
export default function CourseCreator({ project, lessons = [], publishedId: initialPublishedId = null }) {
  const saved = project.data ?? {};

  const [title, setTitle] = useState(project.title ?? "");
  const [summary, setSummary] = useState(saved.summary ?? "");
  const [lessonIds, setLessonIds] = useState(Array.isArray(saved.lessonIds) ? saved.lessonIds : []);
  const [query, setQuery] = useState("");
  const [publishedId, setPublishedId] = useState(initialPublishedId);
  const [status, setStatus] = useState(null); // null | "saving" | { ok } | { error }

  const lessonsById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const chosen = useMemo(() => new Set(lessonIds), [lessonIds]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter(
      (l) => !chosen.has(l.id) && (!q || `${l.title} ${l.summary} ${l.id}`.toLowerCase().includes(q))
    );
  }, [lessons, chosen, query]);

  // Selected lessons that no longer exist.
  const hasMissing = lessonIds.some((id) => !lessonsById.has(id));

  const saveState = useProjectAutosave({
    projectId: project.id,
    enabled: project.canEdit,
    title,
    data: { summary, lessonIds },
  });

  function addLesson(id) {
    setLessonIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function removeLesson(index) {
    setLessonIds((ids) => ids.filter((_, i) => i !== index));
  }

  function moveLesson(index, delta) {
    setLessonIds((ids) => {
      const to = index + delta;
      if (to < 0 || to >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, title, summary, lessons: lessonIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setPublishedId(data.id);
      setStatus({ ok: data.id });
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/create" className="font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          ← /create
        </Link>
        <ProjectBar
          label="/create/course"
          accentClass="text-rose-600 dark:text-rose-400"
          saveState={saveState}
          canEdit={project.canEdit}
        />
        <h1 className="mt-1 text-2xl font-semibold">Create a course</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Link existing lessons together, in order. A course points at lessons rather than copying them.
        </p>

        {/* A disabled fieldset turns off every native input/button inside it for non-owners. */}
        <fieldset disabled={!project.canEdit} className="m-0 min-w-0 border-0 p-0">
          <section className="mt-8 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="mb-4 font-mono text-sm text-zinc-500">course details</h2>

            <label className="block text-sm font-medium" htmlFor="course-title">
              Title
            </label>
            <input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Python Fundamentals"
              className="mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />

            <label className="block text-sm font-medium" htmlFor="course-summary">
              Summary
            </label>
            <input
              id="course-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One line shown at the top of the course"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </section>

          <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="font-mono text-sm text-zinc-500">lessons in this course</h2>
            <p className="mt-1 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Order matters: readers move through the lessons from top to bottom.
            </p>

            {lessonIds.length === 0 ? (
              <p className="rounded border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No lessons yet. Add some from the list below.
              </p>
            ) : (
              <ol className="space-y-2">
                {lessonIds.map((id, index) => {
                  const lesson = lessonsById.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <span className="font-mono text-sm text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1">
                        {lesson ? (
                          <>
                            <p className="truncate text-sm font-medium">
                              {lesson.title}
                              {!lesson.available && (
                                <span className="ml-2 font-mono text-xs text-zinc-400"># coming soon</span>
                              )}
                            </p>
                          </>
                        ) : (
                          <p className="truncate text-sm text-red-600 dark:text-red-400">
                            <span className="font-mono">{id}</span> no longer exists. Remove it to publish.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveLesson(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move lesson ${index + 1} up`}
                          className={smallButton}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLesson(index, 1)}
                          disabled={index === lessonIds.length - 1}
                          aria-label={`Move lesson ${index + 1} down`}
                          className={smallButton}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLesson(index)}
                          aria-label={`Remove lesson ${index + 1}`}
                          className={smallButton}
                        >
                          remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="font-mono text-sm text-zinc-500">add lessons</h2>
            <p className="mt-1 mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Every published lesson is listed here, including lessons written by other people. A lesson can be in
              more than one course.
            </p>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lessons"
              aria-label="Search lessons"
              className="mb-3 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />

            {matches.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {lessons.length === 0
                  ? "There are no lessons yet."
                  : query.trim()
                    ? "No lessons match your search."
                    : "Every lesson is already in this course."}
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-zinc-200 overflow-y-auto rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {matches.map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {lesson.title}
                        {!lesson.available && (
                          <span className="ml-2 font-mono text-xs text-zinc-400"># coming soon</span>
                        )}
                      </p>
                      {lesson.summary && <p className="truncate text-xs text-zinc-500">{lesson.summary}</p>}
                      {lesson.alsoIn?.length > 0 && (
                        <p className="truncate text-xs text-zinc-500">
                          Also in {lesson.alsoIn.map((t) => `\u201C${t}\u201D`).join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addLesson(lesson.id)}
                      aria-label={`Add ${lesson.title}`}
                      className="font-mono text-sm text-rose-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 dark:text-rose-400"
                    >
                      + add
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving" || !title.trim() || lessonIds.length === 0 || hasMissing}
              className="rounded-md bg-rose-500 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
            >
              {status === "saving" ? "saving..." : publishedId ? "$ update course" : "$ publish course"}
            </button>

            {status?.ok ? (
              <p className="text-sm text-teal-600 dark:text-teal-400">
                {publishedId ? "Published." : "Saved."}{" "}
                <Link href={`/courses/${status.ok}`} className="underline">
                  View it
                </Link>
                .
              </p>
            ) : (
              publishedId &&
              status === null && (
                <p className="text-sm text-zinc-500">
                  Published.{" "}
                  <Link href={`/courses/${publishedId}`} className="underline">
                    View it
                  </Link>
                  . Edits go live when you update the course.
                </p>
              )
            )}
            {status?.error && <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>}
          </div>
        </fieldset>
      </div>
    </div>
  );
}