"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import AITutor from "@/components/AITutor";

const WebEditor = dynamic(() => import("./WebEditor"), { ssr: false, loading: () => <div className="h-full bg-zinc-950" /> });
const WebPreview = dynamic(() => import("./WebPreview"), { ssr: false, loading: () => <div className="h-full bg-black" /> });

const DEBOUNCE_MS = 400;

function ViewToggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
        active
          ? "border-orange-400 text-orange-400"
          : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Project</title>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Start coding here...</p>
</body>
</html>`;

const DEFAULT_CSS = `body {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: #f5f5f5;
  color: #333;
}

h1 {
  color: #ff6b6b;
  margin-bottom: 10px;
}

p {
  line-height: 1.6;
}`;

const DEFAULT_JS = `console.log('Hello from JavaScript!');

// Your code here`;

export default function WebPlayground({
  lessonTitle,
  lessonContent,
  initialHtml = null,
  initialCss = null,
  initialJs = null,
  resetHtml = null,
  resetCss = null,
  resetJs = null,
  onCodeChange = null,
  aiContext = null,
  contextType = "web",
  contextTitle = lessonTitle,
}) {
  const [html, setHtml] = useState(() => initialHtml ?? DEFAULT_HTML);
  const [css, setCss] = useState(() => initialCss ?? DEFAULT_CSS);
  const [js, setJs] = useState(() => initialJs ?? DEFAULT_JS);

  const [debouncedHtml, setDebouncedHtml] = useState(() => initialHtml ?? DEFAULT_HTML);
  const [debouncedCss, setDebouncedCss] = useState(() => initialCss ?? DEFAULT_CSS);
  const [debouncedJs, setDebouncedJs] = useState(() => initialJs ?? DEFAULT_JS);

  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const hasLesson = Boolean(lessonContent);
  const [showLesson, setShowLesson] = useState(hasLesson);
  const [showOutput, setShowOutput] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  // Load saved code on mount
  useEffect(() => {
    if (initialHtml != null || initialCss != null || initialJs != null) return;

    let cancelled = false;
    fetch("/api/web")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.html) setHtml(data.html);
        if (data?.css) setCss(data.css);
        if (data?.js) setJs(data.js);
        setDebouncedHtml(data?.html ?? DEFAULT_HTML);
        setDebouncedCss(data?.css ?? DEFAULT_CSS);
        setDebouncedJs(data?.js ?? DEFAULT_JS);
      })
      .catch(() => {
        // No saved code yet, or network error
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce HTML updates
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHtml(html), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [html]);

  // Debounce CSS updates
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCss(css), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [css]);

  // Debounce JS updates
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedJs(js), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [js]);

  // Call onCodeChange when debounced code changes
  useEffect(() => {
    if (onCodeChange) {
      onCodeChange({ html: debouncedHtml, css: debouncedCss, js: debouncedJs });
    }
  }, [debouncedHtml, debouncedCss, debouncedJs, onCodeChange]);

  function handleReset() {
    setHtml(resetHtml ?? DEFAULT_HTML);
    setCss(resetCss ?? DEFAULT_CSS);
    setJs(resetJs ?? DEFAULT_JS);
  }

  const layout = `grid ${
    showLesson && showOutput && showCode
      ? "grid-cols-3 gap-2"
      : showLesson || showOutput || showCode
        ? "grid-cols-2 gap-2"
        : "grid-cols-1"
  }`;

  return (
    <div className={`flex h-full w-full flex-col bg-zinc-950 text-zinc-100`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex gap-2">
          <ViewToggle
            label={`${showLesson ? "✓" : ""} Lesson`}
            active={showLesson}
            onClick={() => setShowLesson(!showLesson)}
          />
          <ViewToggle
            label={`${showCode ? "✓" : ""} Code`}
            active={showCode}
            onClick={() => setShowCode(!showCode)}
          />
          <ViewToggle
            label={`${showOutput ? "✓" : ""} Preview`}
            active={showOutput}
            onClick={() => setShowOutput(!showOutput)}
          />
        </div>

        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="font-mono text-xs text-zinc-500">
              {saveStatus.savedAt ? "saved" : saveStatus.error ? "error" : "saving..."}
            </span>
          )}
          <button
            onClick={handleReset}
            className="rounded border border-zinc-700 px-3 py-1 font-mono text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
          >
            reset
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className={`flex-1 overflow-hidden ${layout}`}>
        {showLesson && lessonContent && (
          <div className="overflow-y-auto border-r border-zinc-800 p-4 text-sm">
            <div className="prose prose-invert max-w-none">
              {lessonContent}
            </div>
          </div>
        )}

        {showCode && (
          <div className="overflow-hidden border-r border-zinc-800">
            <WebEditor
              html={html}
              css={css}
              js={js}
              onHtmlChange={setHtml}
              onCssChange={setCss}
              onJsChange={setJs}
            />
          </div>
        )}

        {showOutput && (
          <div className="overflow-hidden bg-white">
            <WebPreview
              html={debouncedHtml}
              css={debouncedCss}
              js={debouncedJs}
            />
          </div>
        )}
      </div>

      {/* AI Tutor */}
      {aiContext && (
        <div className="border-t border-zinc-800 p-4">
          <AITutor
            context={aiContext}
            contextType={contextType}
            contextTitle={contextTitle}
          />
        </div>
      )}
    </div>
  );
}
