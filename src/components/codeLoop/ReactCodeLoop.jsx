"use client";

import { useMemo } from "react";
import ReactDemo from "@/components/mdx/ReactDemoClient";
import {
  MAX_REACT_DEMO_CODE,
  serializeReactDemoArtifacts,
} from "@/lib/reactDemo";
import {
  REACT_CODE_LOOP_STATUS,
} from "@/lib/reactCodeLoop";
import { useReactCodeLoop } from "@/components/codeLoop/useReactCodeLoop";

async function compileWithReactDemoApi(source, { signal }) {
  const response = await fetch("/api/react-demos/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: source }),
    signal,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "React demo validation failed.");
  return result;
}

const STATUS_LABEL = {
  [REACT_CODE_LOOP_STATUS.idle]: "ready to run",
  [REACT_CODE_LOOP_STATUS.compiling]: "compiling…",
  [REACT_CODE_LOOP_STATUS.ready]: "compiled",
  [REACT_CODE_LOOP_STATUS.error]: "compile error",
};

/**
 * A small authoring surface for the common React demo loop:
 * edit source, compile it through an injected adapter, and render the last
 * successful artifact in the existing restricted demo runner.
 */
export default function ReactCodeLoop({
  code,
  defaultCode = "",
  onCodeChange,
  title = "Interactive React demo",
  compile = compileWithReactDemoApi,
  autoCompile = true,
  debounceMs = 350,
  rows = 10,
}) {
  const compiler = useMemo(() => compile, [compile]);
  const loop = useReactCodeLoop({
    source: code,
    initialSource: defaultCode,
    onSourceChange: onCodeChange,
    compile: compiler,
    autoCompile,
    debounceMs,
  });
  const data = loop.compiled ? serializeReactDemoArtifacts([{ title, compiled: loop.compiled }]) : "";

  return (
    <section className="space-y-3">
      <textarea
        value={loop.source}
        maxLength={MAX_REACT_DEMO_CODE}
        rows={rows}
        spellCheck={false}
        onChange={(event) => loop.setSource(event.target.value)}
        aria-label={`${title} source code`}
        className="w-full resize-y rounded border border-zinc-300 bg-zinc-950 px-3 py-2 font-mono text-xs leading-5 text-zinc-100 dark:border-zinc-700"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { void loop.compile(); }}
          disabled={loop.isCompiling || !loop.source.trim()}
          className="rounded bg-amber-500 px-3 py-1.5 font-mono text-xs font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {loop.isCompiling ? "compiling…" : "run demo"}
        </button>
        <button
          type="button"
          onClick={loop.reset}
          className="rounded border border-zinc-300 px-3 py-1.5 font-mono text-xs text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          reset
        </button>
        <span className="font-mono text-xs text-zinc-500" role="status" aria-live="polite">
          {STATUS_LABEL[loop.status]}
        </span>
      </div>
      {loop.error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{loop.error}</p>}
      {data ? (
        <ReactDemo data={data} title={title} />
      ) : (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          {loop.isCompiling ? "Compiling interactive demo…" : "Run the demo to preview it."}
        </div>
      )}
    </section>
  );
}

export { compileWithReactDemoApi };
