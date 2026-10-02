"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "circuits.layout";
const DEFAULT_LESSON_PCT = 40;
const MIN_LESSON_PCT = 20;
const MAX_LESSON_PCT = 75;
const KEY_STEP_PCT = 2;

const MODES = [
  { id: "lesson", label: "Lesson", hint: "Lesson only" },
  { id: "split", label: "Split", hint: "Lesson left, circuit right" },
  { id: "circuit", label: "Circuit", hint: "Circuit only" },
];

const clamp = (n) => Math.min(MAX_LESSON_PCT, Math.max(MIN_LESSON_PCT, n));

/**
 * Layout shell for the circuit page. Three modes:
 *   - "lesson":  documentation fills the page
 *   - "split":   lesson on the left, circuit on the right (stacked on narrow
 *                screens), with a draggable divider on wide ones
 *   - "circuit": editor fills the page
 *
 * The editor (`children`) is never unmounted when switching modes — it is
 * only hidden with CSS — so undo history, the current circuit, selection and
 * pan/zoom all survive a mode change.
 */
export default function SplitLayout({ title, lessonContent, children }) {
  const [mode, setMode] = useState("split");
  const [lessonPct, setLessonPct] = useState(DEFAULT_LESSON_PCT);
  const [dragging, setDragging] = useState(false);
  const bodyRef = useRef(null);
  const loadedRef = useRef(false);

  // Restore the person's last layout after mount (not in the useState
  // initializer, so server and client render the same markup on first paint).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved && MODES.some((m) => m.id === saved.mode)) setMode(saved.mode);
      if (saved && typeof saved.lessonPct === "number") setLessonPct(clamp(saved.lessonPct));
    } catch {
      // storage unavailable or corrupt — fall back to defaults
    }
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, lessonPct }));
    } catch {
      // ignore
    }
  }, [mode, lessonPct]);

  function onDividerPointerDown(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onDividerPointerMove(e) {
    if (!dragging || !bodyRef.current) return;
    const rect = bodyRef.current.getBoundingClientRect();
    setLessonPct(clamp(((e.clientX - rect.left) / rect.width) * 100));
  }
  function onDividerPointerUp(e) {
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function onDividerKeyDown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setLessonPct((p) => clamp(p - KEY_STEP_PCT));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setLessonPct((p) => clamp(p + KEY_STEP_PCT));
    }
  }

  const lessonClass =
    mode === "circuit"
      ? "hidden"
      : mode === "lesson"
        ? "min-h-0 flex-1 overflow-y-auto"
        : "max-h-64 shrink-0 overflow-y-auto border-b border-zinc-800 lg:max-h-none lg:w-[var(--lesson-w)] lg:border-b-0";

  const editorClass = mode === "lesson" ? "hidden" : "flex min-h-0 min-w-0 flex-1 flex-col";

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-[600px] flex-col bg-zinc-950">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4">
        <span className="truncate text-sm text-zinc-300">{mode === "circuit" ? title : ""}</span>
        <div role="group" aria-label="Page layout" className="flex shrink-0 rounded-md border border-zinc-800 p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded px-2.5 py-1 font-mono text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                mode === m.id ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={bodyRef}
        className={`flex min-h-0 flex-1 flex-col lg:flex-row ${dragging ? "select-none" : ""}`}
        style={{ "--lesson-w": `${lessonPct}%` }}
      >
        <div className={`bg-zinc-950 px-6 py-6 ${lessonClass}`}>
          <div className={mode === "lesson" ? "mx-auto max-w-3xl" : ""}>
            <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              {lessonContent ?? <p className="text-zinc-500">No lesson content yet.</p>}
            </div>
          </div>
        </div>

        {mode === "split" && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize lesson and circuit panes"
            aria-valuemin={MIN_LESSON_PCT}
            aria-valuemax={MAX_LESSON_PCT}
            aria-valuenow={Math.round(lessonPct)}
            tabIndex={0}
            title="Drag to resize, double-click to reset"
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={onDividerPointerUp}
            onPointerCancel={onDividerPointerUp}
            onKeyDown={onDividerKeyDown}
            onDoubleClick={() => setLessonPct(DEFAULT_LESSON_PCT)}
            className={`hidden w-1.5 shrink-0 cursor-col-resize touch-none transition-colors focus:outline-none focus-visible:bg-violet-500 lg:block ${
              dragging ? "bg-violet-500" : "bg-zinc-800 hover:bg-violet-500/70"
            }`}
          />
        )}

        <div className={editorClass}>{children}</div>
      </div>
    </div>
  );
}

/** Used when the editor is embedded in a bigger page (`compact`): no lesson pane. */
export function CompactShell({ children }) {
  return <div className="flex h-full flex-col bg-zinc-950">{children}</div>;
}