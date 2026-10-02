"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import FilterFields from "@/components/filters/FilterFields";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import ProjectBar from "@/components/creator/ProjectBar";

export default function LessonCreator({ project }) {
  const saved = project.data ?? {};

  const [title, setTitle] = useState(project.title ?? "");
  const [summary, setSummary] = useState(saved.summary ?? "");
  const [puzzleIds, setPuzzleIds] = useState(saved.puzzleIds?.length ? saved.puzzleIds : [""]);
  const [blocks, setBlocks] = useState(
    Array.isArray(saved.blocks)
      ? saved.blocks
      : [newTextBlock({ size: "title", bold: true }), newTextBlock({ size: "normal" })]
  );
  const [status, setStatus] = useState(null); // null | "saving" | { ok } | { error }

  const [areas, setAreas] = useState(saved.areas ?? []);
  const [topics, setTopics] = useState(saved.topics ?? []);
  const [tags, setTags] = useState(saved.tags ?? []);
  const [languages, setLanguages] = useState(saved.languages ?? []);
  const [difficulty, setDifficulty] = useState(saved.difficulty ?? "");

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);

  const saveState = useProjectAutosave({
    projectId: project.id,
    enabled: project.canEdit,
    title,
    data: { summary, puzzleIds, blocks, areas, topics, tags, languages, difficulty },
  });

  function updatePuzzleId(index, value) {
    setPuzzleIds((ids) => ids.map((id, i) => (i === index ? value : id)));
  }

  function removePuzzleId(index) {
    setPuzzleIds((ids) => {
      const next = ids.filter((_, i) => i !== index);
      return next.length ? next : [""];
    });
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/lessons", {
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
          // Blank rows are dropped here; the server trims, de-duplicates and
          // checks that every ID matches an existing puzzle.
          puzzles: puzzleIds.map((id) => id.trim()).filter(Boolean),
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
      <div className="mx-auto max-w-3xl">
        <Link href="/create" className="font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          ← /create
        </Link>
        <ProjectBar
          label="/create/lesson"
          accentClass="text-amber-600 dark:text-amber-400"
          saveState={saveState}
          canEdit={project.canEdit}
        />
        <h1 className="mt-1 text-2xl font-semibold">Create a lesson</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Write a lesson from text blocks — no Markdown syntax required. Link existing puzzles for readers to practice.
        </p>

        {/* A disabled fieldset turns off every native input/button inside it for non-owners. */}
        <fieldset disabled={!project.canEdit} className="m-0 min-w-0 border-0 p-0">
          <section className="mt-8 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="mb-4 font-mono text-sm text-zinc-500">lesson details</h2>

            <label className="block text-sm font-medium" htmlFor="lesson-title">
              Title
            </label>
            <input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Variables & Types"
              className="mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />

            <label className="block text-sm font-medium" htmlFor="lesson-summary">
              Summary
            </label>
            <input
              id="lesson-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One line shown in the lesson list"
              className="mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />

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
          </section>

          <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="font-mono text-sm text-zinc-500">linked puzzles</h2>
            <p className="mt-1 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Paste the ID of an existing puzzle (its filename in <code className="font-mono">content/puzzles</code>,
              without <code className="font-mono">.mdx</code>). The lesson links to the puzzle rather than copying it.
              Order matters: readers go from the lesson to the first puzzle, then on to each one in turn.
            </p>

            <ul className="space-y-2">
              {puzzleIds.map((id, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    value={id}
                    onChange={(e) => updatePuzzleId(index, e.target.value)}
                    placeholder="e.g. fibonacci-sum"
                    aria-label={`Puzzle ID ${index + 1}`}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() => removePuzzleId(index)}
                    aria-label={`Remove puzzle ID ${index + 1}`}
                    className="rounded border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-500 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:border-zinc-700 dark:hover:text-zinc-200"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setPuzzleIds((ids) => [...ids, ""])}
              className="mt-3 font-mono text-sm text-amber-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-amber-400"
            >
              + add puzzle
            </button>
          </section>

          <TextBlockEditor blocks={blocks} onChange={setBlocks} accent="amber" />

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
              className="rounded-md bg-amber-500 px-5 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {status === "saving" ? "saving..." : "$ save lesson"}
            </button>

            {status?.ok && (
              <p className="text-sm text-teal-600 dark:text-teal-400">
                Saved.{" "}
                <Link href={`/python/${status.ok}`} className="underline">
                  View it
                </Link>
                .
              </p>
            )}
            {status?.error && <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
