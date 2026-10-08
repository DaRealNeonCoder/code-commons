"use client";

import { useEffect, useRef, useState } from "react";
import ShaderEditor from "./ShaderEditor";
import ShaderCanvas from "./ShaderCanvas";
import { DEFAULT_SHADER } from "@/lib/shaders/defaultShader";

const DEBOUNCE_MS = 400;

function ViewToggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
        active
          ? "border-fuchsia-400 text-fuchsia-400"
          : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function ShaderPlayground({
  lessonTitle,
  lessonContent,
  initialCode = null,
  // What "reset" returns to. Falls back to initialCode, then the default shader.
  resetCode = null,
  // Called with the latest code on every edit (and on reset), so a parent
  // (e.g. ShaderCreator) can keep its own copy.
  onCodeChange = null,
}) {
  const [code, setCode] = useState(() => initialCode ?? DEFAULT_SHADER);
  const [debouncedCode, setDebouncedCode] = useState(() => initialCode ?? DEFAULT_SHADER);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | { savedAt } | { error }

  // Which of the three panes are visible. The lesson pane only exists when
  // there's lesson content (the standalone playground has none).
  const hasLesson = Boolean(lessonContent);
  const [showLesson, setShowLesson] = useState(hasLesson);
  const [showOutput, setShowOutput] = useState(true);
  const [showCode, setShowCode] = useState(true);

  const outputRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (initialCode != null) return;
    let cancelled = false;
    fetch("/api/shaders")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.code) return;
        setCode(data.code);
        setDebouncedCode(data.code); // skip the debounce delay for an initial load
      })
      .catch(() => {
        // No saved shader yet, or a network hiccup — the default shader
        // already showing is a perfectly fine fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sensible debouncing so we don't recompile on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCode(code), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code]);

  // Keep isFullscreen in sync, including when the user exits with Esc.
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === outputRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function handleCodeChange(nextCode) {
    setCode(nextCode);
    setSaveStatus(null); // a stale "saved" message would be misleading after further edits
    onCodeChange?.(nextCode);
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/shaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveStatus({ error: data.error || "Save failed." });
        return;
      }
      setSaveStatus({ savedAt: data.updatedAt });
    } catch (err) {
      setSaveStatus({ error: `Network error: ${err.message}` });
    }
  }

  // Toggle a pane, but never allow all three to be hidden at once.
  function togglePane(current, setter) {
    const visibleCount = [showLesson, showOutput, showCode].filter(Boolean).length;
    if (current && visibleCount === 1) return;
    setter(!current);
  }

  async function toggleFullscreen() {
    const el = outputRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser; nothing useful to do.
    }
  }

  const showRight = showOutput || showCode;

  // The panes below are always mounted (hidden with CSS rather than removed)
  // so the WebGL context and Monaco editor survive being toggled.
  //
  // Layout rules:
  //   lesson on              -> lesson takes the left half, the rest goes right
  //   lesson + output + code -> right half stacks output over code
  //   output + code only     -> side by side (output left, code right)
  //   any single pane        -> fills the available space
  const rightDirection = showLesson ? "flex-col" : "flex-col md:flex-row";

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
          Shader Playground
        </span>

        <div className="flex flex-wrap items-center gap-3">
          {/* View toggles */}
          <div className="flex items-center gap-1.5">
            {hasLesson && (
              <ViewToggle label="lesson" active={showLesson} onClick={() => togglePane(showLesson, setShowLesson)} />
            )}
            <ViewToggle label="output" active={showOutput} onClick={() => togglePane(showOutput, setShowOutput)} />
            <ViewToggle label="code" active={showCode} onClick={() => togglePane(showCode, setShowCode)} />
          </div>

          {saveStatus && typeof saveStatus === "object" && (
            <span className={`font-mono text-xs ${saveStatus.error ? "text-red-400" : "text-fuchsia-400"}`}>
              {saveStatus.error ? saveStatus.error : "saved ✓"}
            </span>
          )}

          {/* The global scratch-slot Save only makes sense for the
              standalone playground — a content-driven shader has nowhere
              (yet) for a viewer's edits to be saved back to. */}
          {initialCode == null && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="rounded border border-zinc-700 px-3 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-fuchsia-400 hover:text-fuchsia-400 disabled:opacity-50"
            >
              {saveStatus === "saving" ? "saving..." : "save"}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleCodeChange(resetCode ?? initialCode ?? DEFAULT_SHADER)}
            className="rounded border border-zinc-700 px-3 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-fuchsia-400 hover:text-fuchsia-400"
          >
            reset
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Description / instructions */}
        <div
          className={`min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-4 ${
            showLesson ? "" : "hidden"
          } ${showRight ? "border-b border-zinc-800 md:border-b-0 md:border-r" : ""}`}
        >
          <h2 className="mb-3 mt-4 text-lg font-semibold">{lessonTitle}</h2>
          {lessonContent}
        </div>

        {/* Right side: output and/or code */}
        <div className={`min-h-0 min-w-0 flex-1 ${showRight ? `flex ${rightDirection}` : "hidden"}`}>
          {/* Shader output */}
          <div
            ref={outputRef}
            className={`relative min-h-0 min-w-0 flex-1 overflow-hidden bg-black ${showOutput ? "" : "hidden"}`}
          >
            <ShaderCanvas fragmentSource={debouncedCode} onError={setError} onCompiled={() => setError(null)} />

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="absolute right-2 top-2 rounded border border-zinc-700 bg-black/60 px-2 py-1 font-mono text-xs text-zinc-300 opacity-60 transition hover:border-fuchsia-400 hover:text-fuchsia-400 hover:opacity-100"
            >
              {isFullscreen ? "exit fullscreen" : "fullscreen"}
            </button>

            {/* With the code pane hidden the error console isn't visible,
                so surface compile errors over the output instead. */}
            {error && !showCode && (
              <pre className="absolute inset-x-0 bottom-0 max-h-32 overflow-auto whitespace-pre-wrap bg-black/80 p-3 font-mono text-xs text-red-400">
                {error}
              </pre>
            )}
          </div>

          {/* Code editor + error console */}
          <div
            className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${showCode ? "flex" : "hidden"} ${
              showOutput
                ? showLesson
                  ? "border-t border-zinc-800"
                  : "border-t border-zinc-800 md:border-l md:border-t-0"
                : ""
            }`}
          >
            <div className="flex-1 min-h-0 overflow-hidden">
              <ShaderEditor code={code} onChange={handleCodeChange} />
            </div>
            <div className="h-28 shrink-0 overflow-y-auto border-t border-zinc-800 bg-black p-4 font-mono text-sm">
              {error ? (
                <pre className="whitespace-pre-wrap text-red-400">{error}</pre>
              ) : (
                <span className="text-zinc-600"># no errors</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}