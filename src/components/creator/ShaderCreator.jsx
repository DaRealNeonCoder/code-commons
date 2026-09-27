"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import FilterFields from "@/components/filters/FilterFields";
// NOTE: guessed import paths — adjust these two to match wherever your
// ShaderEditor/ShaderCanvas components actually live if this folder is wrong.
import ShaderEditor from "@/components/shaders/ShaderEditor";
import ShaderCanvas from "@/components/shaders/ShaderCanvas";
import { DEFAULT_SHADER } from "@/lib/shaders/defaultShader";

const DEBOUNCE_MS = 400;

export default function ShaderCreator() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [code, setCode] = useState(DEFAULT_SHADER);
  const [debouncedCode, setDebouncedCode] = useState(DEFAULT_SHADER);
  const [error, setError] = useState(null);
  const [blocks, setBlocks] = useState([newTextBlock({ size: "title", bold: true })]);
  const [status, setStatus] = useState(null);

  const [areas, setAreas] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tags, setTags] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [difficulty, setDifficulty] = useState("");

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);

  // Same debounce pattern as ShaderPlayground, so we're not recompiling on
  // every keystroke while someone's mid-lesson-authoring too.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCode(code), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code]);

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/shader-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          difficulty,
          areas,
          topics,
          tags,
          languages,
          starterCode: code,
          content: markdown,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus({ ok: data.id });
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/create" className="font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          ← /create
        </Link>
        <p className="mt-3 font-mono text-sm text-fuchsia-600 dark:text-fuchsia-400">/create/shader</p>
        <h1 className="mt-1 text-2xl font-semibold">Create a shader lesson</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Write and preview the starting shader, then add the lesson text below.
        </p>

        <section className="mt-8 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-4 font-mono text-sm text-zinc-500">lesson details</h2>

          <label className="block text-sm font-medium" htmlFor="shader-title">
            Title
          </label>
          <input
            id="shader-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Your First Fragment Shader"
            className="mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />

          <label className="block text-sm font-medium" htmlFor="shader-summary">
            Summary
          </label>
          <input
            id="shader-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One line shown in the shader lesson list"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />

          <div className="mt-4">
            <FilterFields
              areas={areas}
              onAreasChange={setAreas}
              topics={topics}
              onTopicsChange={setTopics}
              tags={tags}
              onTagsChange={setTags}
              languageMode="multi"
              languages={languages}
              onLanguagesChange={setLanguages}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
            />
          </div>
        </section>

        {/* Starter shader — the real editor + live canvas, instead of a plain textarea */}
        <section className="mt-6 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <h2 className="border-b border-zinc-200 px-4 py-2 font-mono text-sm text-zinc-500 dark:border-zinc-800">
            starter shader
          </h2>
          <div className="flex h-96 flex-col md:flex-row">
            <div className="min-h-0 flex-1 overflow-hidden md:w-1/2">
              <ShaderCanvas fragmentSource={debouncedCode} onError={setError} onCompiled={() => setError(null)} />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden border-t border-zinc-800 md:w-1/2 md:border-l md:border-t-0">
              <ShaderEditor code={code} onChange={setCode} />
            </div>
          </div>
          <div className="h-20 overflow-y-auto border-t border-zinc-800 bg-black p-3 font-mono text-xs">
            {error ? (
              <pre className="whitespace-pre-wrap text-red-400">{error}</pre>
            ) : (
              <span className="text-zinc-600"># no errors</span>
            )}
          </div>
        </section>

        <TextBlockEditor blocks={blocks} onChange={setBlocks} accent="fuchsia" />

        <details className="mt-6 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer select-none font-mono text-sm text-zinc-500">
            preview generated markdown
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {markdown || "(nothing yet)"}
          </pre>
        </details>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving" || !title.trim() || !difficulty}
            className="rounded-md bg-fuchsia-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
          >
            {status === "saving" ? "saving..." : "$ save shader lesson"}
          </button>

          {status?.ok && (
            <p className="text-sm text-teal-600 dark:text-teal-400">Saved as &ldquo;{status.ok}&rdquo;.</p>
          )}
          {status?.error && <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>}
        </div>
      </div>
    </div>
  );
}