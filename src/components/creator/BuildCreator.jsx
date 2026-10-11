"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CodeWorkspace from "@/components/CodeWorkspace";
import FilterFields from "@/components/filters/FilterFields";
import LessonPreview from "@/components/creator/LessonPreview";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import PublishBadge from "@/components/creator/PublishBadge";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import usePublishState from "@/components/creator/usePublishState";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";

const fieldClass =
  "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

// Keep this list in sync with CodeWorkspace's supported languages. The actual
// code editor lives in the workspace tab; these ids are used to validate and
// normalize drafts before they reach it.
const STARTER_LANGUAGES = ["python", "cpp", "rust"];

function normalizeStarter(value) {
  if (typeof value === "string") return { python: value };

  const out = {};
  if (value && typeof value === "object") {
    for (const id of STARTER_LANGUAGES) {
      if (typeof value[id] === "string") out[id] = value[id];
    }
  }
  return out;
}

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
          ? "border-indigo-400 text-indigo-400"
          : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function BuildCreator({
  project,
  publishedId: initialPublishedId = null,
  publishState: initialPublishState = "draft",
}) {
  const saved = project.data ?? {};

  // The coding workspace is the default view. Project text and publishing
  // controls live in the markdown tab, just like the shader creator.
  const [view, setView] = useState("workspace");
  const [title, setTitle] = useState(project.title ?? "");
  const [starterCode, setStarterCode] = useState(() => normalizeStarter(saved.starterCode));
  const [workspaceLanguage, setWorkspaceLanguage] = useState(() => {
    const starter = normalizeStarter(saved.starterCode);
    return STARTER_LANGUAGES.find((id) => starter[id]?.trim()) ?? "python";
  });
  const [blocks, setBlocks] = useState(
    Array.isArray(saved.blocks)
      ? saved.blocks
      : [newTextBlock({ size: "title", bold: true })]
  );
  const [status, setStatus] = useState(null);
  // Old drafts may already have a published id in their saved data.
  const [publishedId, setPublishedId] = useState(
    initialPublishedId ?? saved.publishedId ?? null
  );

  const [areas, setAreas] = useState(saved.areas ?? []);
  const [topics, setTopics] = useState(saved.topics ?? []);
  const [tags, setTags] = useState(saved.tags ?? []);
  const [languages, setLanguages] = useState(saved.languages ?? []);
  const [difficulty, setDifficulty] = useState(saved.difficulty ?? "");

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const draftData = {
    starterCode,
    blocks,
    areas,
    topics,
    tags,
    languages,
    difficulty,
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

  function handleCodeChange(nextCode, language) {
    setStarterCode((previous) => ({ ...previous, [language]: nextCode }));
  }

  async function handlePublish() {
    const snap = JSON.stringify({ title, data: draftData });
    setStatus("saving");

    try {
      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title,
          difficulty,
          areas,
          topics,
          tags,
          languages,
          starterCode,
          blocks,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setPublishedId(data.id);
      markPublished(snap);
      setStatus({ ok: true });
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  const workspaceDescription = (
    <article className="max-w-2xl">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-indigo-400">
        coding project
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
        {title.trim() || "Untitled project"}
      </h1>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <LessonPreview source={markdown} />
      </div>
    </article>
  );

  return (
    <div className="flex h-full w-full flex-col">
      {!project.canEdit && (
        <p className="shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          You&apos;re viewing someone else&apos;s project. It&apos;s read-only, and nothing you do here is saved.
        </p>
      )}

      {/* Keep the tabs in one fixed bar so switching views never moves them. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
        <Link
          href="/create"
          className="font-mono text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← /create
        </Link>

        <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-indigo-400" />
          /create/project
        </span>

        <div role="tablist" aria-label="Project view" className="flex items-center gap-1.5">
          <ViewTab
            label="workspace"
            active={view === "workspace"}
            onClick={() => changeView("workspace")}
          />
          <ViewTab
            label="markdown"
            active={view === "markdown"}
            onClick={() => changeView("markdown")}
          />
        </div>

        {project.canEdit && (
          <>
            <PublishBadge state={publishState} />
            <span
              role="status"
              aria-live="polite"
              className={`font-mono text-xs ${
                saveState === "error" ? "text-red-400" : "text-zinc-500"
              }`}
            >
              {STATUS_TEXT[saveState]}
            </span>
          </>
        )}
      </div>

      {view === "workspace" ? (
        <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
          <CodeWorkspace
            fileBaseName="main"
            starterCode={starterCode}
            initialLanguage={workspaceLanguage}
            onLanguageChange={setWorkspaceLanguage}
            onCodeChange={handleCodeChange}
            description={workspaceDescription}
            accent="emerald"
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-semibold">Create a coding project</h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Write the project description here. Open the workspace tab to edit and run the code.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Code is edited in the workspace tab ({workspaceLanguage}).
              </p>
              <button
                type="button"
                onClick={() => changeView("workspace")}
                className="shrink-0 font-mono text-sm text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-400"
              >
                open workspace
              </button>
            </div>

            <fieldset disabled={!project.canEdit} className="m-0 min-w-0 border-0 p-0">
              <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
                <h2 className="mb-4 font-mono text-sm text-zinc-500">project details</h2>

                <label className="block text-sm font-medium" htmlFor="build-title">
                  Title
                </label>
                <input
                  id="build-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Snake in 60 lines"
                  className={`mb-4 ${fieldClass}`}
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

              <TextBlockEditor blocks={blocks} onChange={setBlocks} accent="teal" />

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
                  disabled={status === "saving" || !title.trim() || !difficulty}
                  className="rounded-md bg-indigo-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {status === "saving"
                    ? "publishing..."
                    : publishState === "draft"
                      ? "$ publish build"
                      : "$ update build"}
                </button>

                {publishedId && status !== "saving" && !status?.error && (
                  <p
                    className={`text-sm ${
                      publishState === "edited"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-teal-600 dark:text-teal-400"
                    }`}
                  >
                    {publishState === "edited"
                      ? "Published, with unpublished edits."
                      : "Published."}{" "}
                    <Link href={`/projects/${publishedId}`} className="underline">
                      View it
                    </Link>
                    .
                    {publishState === "edited" && " Edits go live when you update the build."}
                  </p>
                )}

                {status?.error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>
                )}
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </div>
  );
}
