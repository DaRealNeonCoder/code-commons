"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import ReactDemoEditor, { withReactDemoIds } from "@/components/creator/ReactDemoEditor";
import LessonPreview from "@/components/creator/LessonPreview";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import FilterFields from "@/components/filters/FilterFields";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import usePublishState from "@/components/creator/usePublishState";
import PublishBadge from "@/components/creator/PublishBadge";
import { normalizePuzzleRefs } from "@/lib/puzzleRefs";
import { normalizeReactDemos } from "@/lib/reactDemo";

const smallButton =
  "rounded border border-zinc-300 px-2.5 py-1.5 font-mono text-sm text-zinc-500 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-40 dark:border-zinc-700 dark:hover:text-zinc-200";

const STATUS_TEXT = {
  saved: "draft saved",
  dirty: "unsaved changes",
  saving: "saving...",
  error: "couldn't save",
};

function ViewTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
        active
          ? "border-amber-400 text-amber-400"
          : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

// `puzzles` contains the first page of typed puzzle choices. Further searches
// go through /api/puzzle-choices so the whole catalog is not sent to the page.
export default function LessonCreator({
  project,
  puzzles = [],
  publishedId: initialPublishedId = null,
  publishState: initialPublishState = "draft",
}) {
  const saved = project.data ?? {};

  // The lesson preview is the default view; authoring controls live in the
  // markdown tab, matching the circuit and shader creators.
  const [view, setView] = useState("workspace");

  const [title, setTitle] = useState(project.title ?? "");
  const [summary, setSummary] = useState(saved.summary ?? "");

  // Older projects stored a list with one blank row; drop blanks and duplicates.
  const [puzzleIds, setPuzzleIds] = useState(() => normalizePuzzleRefs(saved.puzzleIds));

  const [query, setQuery] = useState("");
  const [choices, setChoices] = useState(puzzles);
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [publishedId, setPublishedId] = useState(initialPublishedId);

  const [blocks, setBlocks] = useState(
    Array.isArray(saved.blocks)
      ? saved.blocks
      : [newTextBlock({ size: "title", bold: true }), newTextBlock({ size: "normal" })]
  );
  const [reactDemos, setReactDemos] = useState(() => withReactDemoIds(normalizeReactDemos(saved.reactDemos)));

  const [status, setStatus] = useState(null); // null | "saving" | { ok } | { error }

  const [areas, setAreas] = useState(saved.areas ?? []);
  const [topics, setTopics] = useState(saved.topics ?? []);
  const [tags, setTags] = useState(saved.tags ?? []);
  const [languages, setLanguages] = useState(saved.languages ?? []);
  const [difficulty, setDifficulty] = useState(saved.difficulty ?? "");

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const hasText = markdown.trim() !== "";

  const puzzlesById = useMemo(() => new Map(choices.map((p) => [p.ref, p])), [choices]);
  const chosen = useMemo(() => new Set(puzzleIds), [puzzleIds]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingChoices(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        for (const ref of puzzleIds) params.append("selected", ref);
        const response = await fetch(`/api/puzzle-choices?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load puzzle choices.");
        const data = await response.json();
        if (Array.isArray(data.puzzles)) setChoices(data.puzzles);
      } catch (error) {
        if (error.name !== "AbortError") console.error(error);
      } finally {
        if (!controller.signal.aborted) setLoadingChoices(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, puzzleIds]);

  const matches = choices.filter((puzzle) => !chosen.has(puzzle.ref));

  // Linked puzzles that no longer exist.
  const hasMissing = puzzleIds.some((id) => !puzzlesById.has(id));

  const draftData = {
    summary,
    puzzleIds,
    blocks,
    areas,
    topics,
    tags,
    languages,
    difficulty,
    reactDemos,
  };

  const saveState = useProjectAutosave({
    projectId: project.id,
    enabled: project.canEdit,
    title,
    data: draftData,
  });

  const [publishState, markPublished] = usePublishState({
    initial: initialPublishState,
    snapshot: JSON.stringify({ title, data: draftData }),
  });

  function changeView(next) {
    setView(next);
  }

  function addPuzzle(ref) {
    setPuzzleIds((ids) => (ids.includes(ref) ? ids : [...ids, ref]));
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

  async function handlePublish() {
    const snap = JSON.stringify({ title, data: draftData });
    setStatus("saving");

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title,
          summary,
          difficulty,
          areas,
          topics,
          tags,
          languages,
          puzzles: puzzleIds,
          blocks,
          reactDemos,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setPublishedId(data.id);
      markPublished(snap);
      setStatus({ ok: data.id });
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {!project.canEdit && (
        <p className="shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          You&apos;re viewing someone else&apos;s project. It&apos;s read-only, and nothing you do here is saved.
        </p>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
        <Link href="/create" className="font-mono text-sm text-zinc-400 hover:text-zinc-200">
          ← /create
        </Link>

        <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          /create/lesson
        </span>

        <div role="tablist" aria-label="Project view" className="flex items-center gap-1.5">
          <ViewTab label="workspace" active={view === "workspace"} onClick={() => changeView("workspace")} />
          <ViewTab label="markdown" active={view === "markdown"} onClick={() => changeView("markdown")} />
        </div>

        {project.canEdit && (
          <>
            <PublishBadge state={publishState} />
            <span
              role="status"
              aria-live="polite"
              className={`font-mono text-xs ${saveState === "error" ? "text-red-400" : "text-zinc-500"}`}
            >
              {STATUS_TEXT[saveState]}
            </span>
          </>
        )}
      </div>

      {view === "workspace" ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-6 py-8 dark:bg-zinc-950">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-semibold">{title.trim() || "Untitled lesson"}</h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Live preview of the lesson markdown. Edit the content in the markdown tab.
            </p>
            <article className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
              {hasText ? <LessonPreview source={markdown} /> : <p className="text-sm text-zinc-500">Nothing to preview yet. Add text in the markdown tab.</p>}
            </article>
            <button
              type="button"
              onClick={() => changeView("markdown")}
              className="mt-6 font-mono text-sm text-amber-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-amber-400"
            >
              open markdown editor
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-semibold">Create a lesson</h1>
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
                            {puzzle.typeLabel && (
                              <span className="ml-2 font-mono text-xs text-zinc-400"># {puzzle.typeLabel}</span>
                            )}
                            {puzzle.difficulty && (
                              <span className="ml-2 font-mono text-xs text-zinc-400"># {puzzle.difficulty}</span>
                            )}
                            {!puzzle.available && (
                              <span className="ml-2 font-mono text-xs text-zinc-400"># coming soon</span>
                            )}
                          </p>
                        ) : (
                          <p className="truncate text-sm text-red-600 dark:text-red-400">
                            <span className="font-mono">{id}</span> no longer exists. Remove it to publish.
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
              Search across coding, math, shader, and circuit puzzles. Results start with 10 matches and update as you
              search; a puzzle can be linked from more than one lesson.
            </p>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search puzzles"
              aria-label="Search puzzles"
              className="mb-3 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />

            {loadingChoices && matches.length === 0 ? (
              <p className="text-sm text-zinc-500">Loading puzzle choices...</p>
            ) : matches.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {choices.length === 0
                  ? "There are no puzzles yet."
                  : query.trim()
                    ? "No puzzles match your search."
                    : "Every puzzle is already linked to this lesson."}
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-zinc-200 overflow-y-auto rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {matches.map((puzzle) => (
                  <li key={puzzle.ref} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {puzzle.title}
                        {puzzle.typeLabel && (
                          <span className="ml-2 font-mono text-xs text-zinc-400"># {puzzle.typeLabel}</span>
                        )}
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
                      onClick={() => addPuzzle(puzzle.ref)}
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

          <ReactDemoEditor demos={reactDemos} onChange={setReactDemos} accent="amber" />

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
              onClick={handlePublish}
              disabled={status === "saving" || !title.trim() || !difficulty || hasMissing}
              className="rounded-md bg-amber-500 px-5 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {status === "saving"
                ? "publishing..."
                : publishState === "draft"
                  ? "$ publish lesson"
                  : "$ update lesson"}
            </button>

            {publishedId && status !== "saving" && !status?.error && (
              <p
                className={`text-sm ${
                  publishState === "edited"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-teal-600 dark:text-teal-400"
                }`}
              >
                {publishState === "edited" ? "Published, with unpublished edits." : "Published."}{" "}
                <Link href={`/lessons/${publishedId}`} className="underline">
                  View it
                </Link>
                .
                {publishState === "edited" && " Edits go live when you update the lesson."}
              </p>
            )}

            {status?.error && <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>}
          </div>
        </fieldset>
      </div>
        </div>
      )}
    </div>
  );
}
