"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveProgress } from "@/lib/useLiveProgress";
import { isLessonComplete } from "@/lib/progressUtils";

const COLLAPSE_KEY = "codeloop:course-sidebar-collapsed";
const DONE = "text-green-600 dark:text-green-400";

export default function CourseSidebar({ outline, progress: initialProgress, currentLessonId, currentPuzzleId }) {

const progress = useLiveProgress(initialProgress);
const [collapsed, setCollapsed] = useState(false);

  // Restore the saved preference; with none saved, start collapsed on narrow screens.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLLAPSE_KEY);
      if (saved !== null) setCollapsed(saved === "1");
      else if (window.innerWidth < 768) setCollapsed(true);
    } catch {}
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {}
  }

  const lessonStates = outline.lessons.map((lesson) => {
    const availableIds = lesson.puzzles.filter((p) => p.available).map((p) => p.id);
    return {
      lesson,
      done: isLessonComplete(progress, lesson.id, availableIds),
      puzzlesDone: availableIds.filter((id) => progress.puzzles.has(id)).length,
      puzzlesTotal: availableIds.length,
    };
  });
  const availableLessons = lessonStates.filter((s) => s.lesson.available);
  const lessonsDone = availableLessons.filter((s) => s.done).length;

  return (
    <aside
      aria-label={`${outline.title} navigation`}
      className={`flex min-h-0 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
        collapsed ? "w-11" : "w-64"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <Link
            href={`/courses/${outline.id}`}
            className="truncate font-mono text-xs text-amber-600 hover:underline dark:text-amber-400"
          >
            {outline.title}
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand course sidebar" : "Collapse course sidebar"}
          className="rounded px-1.5 font-mono text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && (
        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
          <p className="px-3 pb-2 font-mono text-xs text-zinc-400">
            {lessonsDone}/{availableLessons.length} lessons done
          </p>

          <ol>
            {lessonStates.map(({ lesson, done, puzzlesDone, puzzlesTotal }, i) => {
              const isCurrentLesson = lesson.id === currentLessonId;
              const onLessonPage = isCurrentLesson && !currentPuzzleId;
              const marker = done ? "✓" : String(i + 1).padStart(2, "0");

              if (!lesson.available) {
                return (
                  <li key={lesson.id}>
                    <div className="flex items-baseline gap-2 px-3 py-1.5 text-sm text-zinc-400 dark:text-zinc-600">
                      <span className="font-mono text-xs">{marker}</span>
                      <span className="truncate">{lesson.title}</span>
                      <span className="font-mono text-xs"># soon</span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/lessons/${lesson.id}`}
                    aria-current={onLessonPage ? "page" : undefined}
                    className={`flex items-baseline gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-amber-50 dark:hover:bg-zinc-900 ${
                      onLessonPage
                        ? "bg-amber-50 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                        : isCurrentLesson
                          ? "font-medium text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <span className={`font-mono text-xs ${done ? DONE : "text-zinc-400"}`}>{marker}</span>
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    {puzzlesTotal > 0 && (
                      <span className="font-mono text-xs text-zinc-400">
                        {puzzlesDone}/{puzzlesTotal}
                      </span>
                    )}
                  </Link>

                  {isCurrentLesson && lesson.puzzles.length > 0 && (
                    <ul className="ml-5 border-l border-zinc-200 dark:border-zinc-800">
                      {lesson.puzzles.map((puzzle) => {
                        const isCurrentPuzzle = puzzle.id === currentPuzzleId;
                        const puzzleDone = progress.puzzles.has(puzzle.id);
                        const pMarker = puzzleDone ? "✓" : isCurrentPuzzle ? "▸" : "○";

                        if (!puzzle.available) {
                          return (
                            <li
                              key={puzzle.id}
                              className="flex items-baseline gap-2 px-3 py-1 text-xs text-zinc-400 dark:text-zinc-600"
                            >
                              <span className="font-mono">○</span>
                              <span className="truncate">{puzzle.title}</span>
                              <span className="font-mono"># soon</span>
                            </li>
                          );
                        }

                        return (
                          <li key={puzzle.id}>
                            <Link
                              href={`/puzzles/${puzzle.id}?lesson=${encodeURIComponent(lesson.id)}`}
                              aria-current={isCurrentPuzzle ? "page" : undefined}
                              className={`flex items-baseline gap-2 px-3 py-1 text-xs transition-colors hover:bg-teal-50 dark:hover:bg-zinc-900 ${
                                isCurrentPuzzle
                                  ? "bg-teal-50 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                                  : "text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <span
                                className={`font-mono ${
                                  puzzleDone
                                    ? DONE
                                    : isCurrentPuzzle
                                      ? "text-teal-600 dark:text-teal-400"
                                      : "text-zinc-400"
                                }`}
                              >
                                {pMarker}
                              </span>
                              <span className="truncate">{puzzle.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </aside>
  );
}