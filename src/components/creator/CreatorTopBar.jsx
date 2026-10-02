"use client";

import Link from "next/link";

// Shared header for the shader and circuit creators. It stays in the same place
// in both views so switching between the workspace and the Markdown creator is
// a single click either way. (ProjectBar is untouched and still used by
// LessonCreator.)

const STATUS_TEXT = {
  saved: "saved",
  dirty: "unsaved changes",
  saving: "saving...",
  error: "couldn't save",
};

// Full class names so Tailwind can see them.
const ACTIVE_TAB = {
  fuchsia: "border-fuchsia-500 text-fuchsia-600 dark:border-fuchsia-400 dark:text-fuchsia-400",
  blue: "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400",
};

const VIEWS = [
  { id: "workspace", label: "workspace" },
  { id: "markdown", label: "markdown" },
];

export default function CreatorTopBar({ label, accentClass, accent, saveState, canEdit, view, onViewChange }) {
  const isError = saveState === "error";

  return (
    <div className="shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/create" className="font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            ← /create
          </Link>
          <span className={`font-mono text-sm ${accentClass}`}>{label}</span>
        </div>

        <div role="tablist" aria-label="Project view" className="flex items-center gap-1.5">
          {VIEWS.map(({ id, label: text }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`creator-panel-${id}`}
                onClick={() => onViewChange(id)}
                className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                  active
                    ? ACTIVE_TAB[accent]
                    : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>

        {canEdit ? (
          <span
            role="status"
            aria-live="polite"
            className={`font-mono text-xs ${isError ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}
          >
            {STATUS_TEXT[saveState]}
          </span>
        ) : (
          <span />
        )}
      </div>

      {!canEdit && (
        <p className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          You&apos;re viewing someone else&apos;s project. It&apos;s read-only, and nothing you do here is saved.
        </p>
      )}
    </div>
  );
}