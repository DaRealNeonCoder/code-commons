"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import CompletionToggle from "@/components/CompletionToggle";
import AITutor from "@/components/AITutor";
import { buildPreviewDocument } from "@/lib/web/webPuzzle";
import { runWebChecks } from "@/lib/web/runWebChecks";

const WebEditor = dynamic(() => import("./WebEditor"), {
  ssr: false,
  loading: () => <div className="h-full bg-zinc-900" />,
});

const PREVIEW_DELAY_MS = 400;

function ResultsPanel({ outcome, error }) {
  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }
  if (!outcome) return null;

  const { results, uncaught } = outcome;
  const passed = results.filter((r) => r.pass).length;
  const complete = passed === results.length;

  return (
    <div className="space-y-2">
      <p className={`text-sm ${complete ? "text-green-400" : "text-amber-400"}`}>
        {complete ? `All ${results.length} checks passed!` : `${passed}/${results.length} checks passed`}
      </p>
      {uncaught && <p className="text-xs text-red-400">Your JavaScript stopped with an error: {uncaught}</p>}
      <ul className="space-y-1.5">
        {results.map((result, index) => (
          <li key={index} className="text-sm">
            <span className={result.pass ? "text-green-400" : "text-red-400"}>{result.pass ? "✓" : "✗"}</span>{" "}
            <span className="text-zinc-700 dark:text-zinc-300">{result.label}</span>
            {!result.pass && result.message && (
              <span className="block pl-5 text-xs text-zinc-500">{result.message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WebPuzzleWorkspace({
  description,
  files: starterFiles,
  checks,
  itemId,
  aiContext = "",
  aiContextTitle = "",
}) {
  const [files, setFiles] = useState(starterFiles);
  const [previewFiles, setPreviewFiles] = useState(starterFiles);
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  // The preview waits until the learner pauses typing, so it doesn't reload on every key.
  useEffect(() => {
    const timer = setTimeout(() => setPreviewFiles(files), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [files]);

  const previewSource = useMemo(() => buildPreviewDocument(previewFiles), [previewFiles]);

  function updateFile(name, value) {
    setFiles((current) => ({ ...current, [name]: value }));
    setOutcome(null);
    setError("");
  }

  function reset() {
    setFiles(starterFiles);
    setOutcome(null);
    setError("");
  }

  async function check() {
    setChecking(true);
    setError("");
    try {
      setOutcome(await runWebChecks({ files, checks }));
    } catch (err) {
      setOutcome(null);
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-zinc-100 dark:bg-zinc-950 lg:flex-row lg:overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-2xl">{description}</div>
      </div>

      <div className="flex min-h-[80vh] w-full flex-col border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:min-h-0 lg:w-[min(50vw,46rem)] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">web puzzle</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={reset} className="rounded border border-zinc-300 px-3 py-1.5 font-mono text-xs text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300">
              reset
            </button>
            <button type="button" onClick={check} disabled={checking} className="rounded bg-teal-600 px-3 py-1.5 font-mono text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">
              {checking ? "checking..." : "check my code"}
            </button>
            <CompletionToggle itemType="puzzle" itemId={itemId} />
          </div>
        </div>

        <div className="h-[340px] shrink-0 border-b border-zinc-800">
          <WebEditor
            html={files.html}
            css={files.css}
            js={files.js}
            onHtmlChange={(value) => updateFile("html", value)}
            onCssChange={(value) => updateFile("css", value)}
            onJsChange={(value) => updateFile("js", value)}
          />
        </div>

        <div className="grid min-h-[260px] flex-1 grid-cols-1 gap-0 md:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b border-zinc-200 md:border-b-0 md:border-r dark:border-zinc-800">
            <p className="px-4 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">preview</p>
            <iframe
              title="Live preview"
              sandbox="allow-scripts"
              srcDoc={previewSource}
              className="m-3 h-[240px] w-[calc(100%-1.5rem)] rounded border border-zinc-200 bg-white dark:border-zinc-700"
            />
          </div>
          <div className="min-h-0 overflow-y-auto px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">checks</p>
            <div className="mt-3">
              {!outcome && !error && <p className="text-sm text-zinc-500">Press &ldquo;check my code&rdquo; when you are ready.</p>}
              <ResultsPanel outcome={outcome} error={error} />
            </div>
          </div>
        </div>

        <AITutor lessonContent={aiContext} contextType="puzzle" contextTitle={aiContextTitle} />
      </div>
    </div>
  );
}
