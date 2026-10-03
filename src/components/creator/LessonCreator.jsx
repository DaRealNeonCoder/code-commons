"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import FilterFields from "@/components/filters/FilterFields";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import ProjectBar from "@/components/creator/ProjectBar";

const smallButton =
  "rounded border border-zinc-300 px-2.5 py-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-40 dark:border-zinc-700 dark:hover:text-zinc-200";

// `puzzles` (every puzzle, anyone's) and `publishedId` (the lesson this project
// was last saved as) are computed on the server in the editor page.
export default function LessonCreator({ project, puzzles = [], publishedId: initialPublishedId = null }) {
  const saved = project.data ?? {};

  const [title, setTitle] = useState(project.title ?? "");
  const [summary, setSummary] = useState(saved.summary ?? "");
  // Older projects stored a list with one blank row; drop blanks and duplicates.
  const [puzzleIds, setPuzzleIds] = useState(() =>
    Array.isArray(saved.puzzleIds)
      ? [...new Set(saved.puzzleIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))]
      : []
  );
  const [query, setQuery] = useState("");
  const [publishedId, setPublishedId] = useState(initialPublishedId);
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

  const puzzlesById = useMemo(() => new Map(puzzles.map((p) => [p.id, p])), [puzzles]);
  const chosen = useMemo(() => new Set(puzzleIds), [puzzleIds]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return puzzles.filter(
      (p) => !chosen.has(p.id) && (!q || `${p.title} ${p.summary} ${p.id} ${p.difficulty}`.toLowerCase().includes(q))
    );
  }, [puzzles, chosen, query]);

  // Linked puzzles that no longer exist.
  const hasMissing = puzzleIds.some((id) => !puzzlesById.has(id));

  const saveState = useProjectAutosave({
    projectId: project.id,
    enabled: project.canEdit,
    title,
    data: { summary, puzzleIds, blocks, areas, topics, tags, languages, difficulty },
  });

  function addPuzzle(id) {
    setPuzzleIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function removePuzzle(index) {
    setPuzzleIds((ids) => ids.filter((_, i) => i !== index));
  }

  function movePuzzle(index, delta) {
    setPuzzleIds((ids) => {
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
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The server checks that this project is a lesson owned by the signed-in
          // user, and uses it to update the existing lesson instead of duplicating it.
          projectId: project.id,
          title,
          summary,
          difficulty,
          areas,
          topics,
          tags,
          languages,
          // The server trims, de-duplicates and checks that every ID matches
          // an existing puzzle.
          puzzles: puzzleIds,
          content: markdown,
        }),
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
              Puzzles let readers test whether they understood the lesson. Order matters: readers go from the lesson to
              the first puzzle, then on to each one in turn. The lesson links to a puzzle rather than copying it.
            </p>

            {puzzleIds.length === 0 ? (
              <p className="rounded border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No puzzles yet. Add some from the list below.
              </p>
            ) : (
              <ol className="space-y-2">
                {puzzleIds.map((id, index) => {
                  const puzzle = puzzlesById.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <span className="font-mono text-sm text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1">
                        {puzzle ? (
                          <p className="truncate text-sm font-medium">
                            {puzzle.title}
                            {puzzle.difficulty && (
                              <span className="ml-2 font-mono text-xs text-zinc-400"># {puzzle.difficulty}</span>
                            )}
                            {!puzzle.available && (
                              <span className="ml-2 font-mono text-xs text-zinc-400"># coming soon</span>
                            )}
                          </p>
                        ) : (
                          <p className="truncate text-sm text-red-600 dark:text-red-400">
                            <span className="font-mono">{id}</span> no longer exists. Remove it to save.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => movePuzzle(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move puzzle ${index + 1} up`}
                          className={smallButton}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => movePuzzle(index, 1)}
                          disabled={index === puzzleIds.length - 1}
                          aria-label={`Move puzzle ${index + 1} down`}
                          className={smallButton}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removePuzzle(index)}
                          aria-label={`Remove puzzle ${index + 1}`}
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
            <h2 className="font-mono text-sm text-zinc-500">add puzzles</h2>
            <p className="mt-1 mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Every puzzle is listed here, including puzzles written by other people. A puzzle can be linked from more
              than one lesson.
            </p>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search puzzles"
              aria-label="Search puzzles"
              className="mb-3 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />

            {matches.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {puzzles.length === 0
                  ? "There are no puzzles yet."
                  : query.trim()
                    ? "No puzzles match your search."
                    : "Every puzzle is already linked to this lesson."}
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-zinc-200 overflow-y-auto rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {matches.map((puzzle) => (
                  <li key={puzzle.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {puzzle.title}
                        {puzzle.difficulty && (
                          <span className="ml-2 font-mono text-xs text-zinc-400"># {puzzle.difficulty}</span>
                        )}
                        {!puzzle.available && (
                          <span className="ml-2 font-mono text-xs text-zinc-400"># coming soon</span>
                        )}
                      </p>
                      {puzzle.summary && <p className="truncate text-xs text-zinc-500">{puzzle.summary}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => addPuzzle(puzzle.id)}
                      aria-label={`Add ${puzzle.title}`}
                      className="font-mono text-sm text-amber-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-amber-400"
                    >
                      + add
                    </button>
                  </li>
                ))}
              </ul>
            )}
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving" || !title.trim() || !difficulty || hasMissing}
              className="rounded-md bg-amber-500 px-5 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {status === "saving" ? "saving..." : publishedId ? "$ update lesson" : "$ save lesson"}
            </button>

            {status?.ok ? (
              <p className="text-sm text-teal-600 dark:text-teal-400">
                Saved.{" "}
                <Link href={`/python/${status.ok}`} className="underline">
                  View it
                </Link>
                .
              </p>
            ) : (
              publishedId &&
              status === null && (
                <p className="text-sm text-zinc-500">
                  Saved.{" "}
                  <Link href={`/python/${publishedId}`} className="underline">
                    View it
                  </Link>
                  . Edits go live when you update the lesson.
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