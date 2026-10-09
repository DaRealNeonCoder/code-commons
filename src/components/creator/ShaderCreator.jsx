"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import ShaderPlayground from "@/components/shaders/ShaderPlayground";
import LessonPreview from "@/components/creator/LessonPreview";
import PublishBadge from "@/components/creator/PublishBadge";
import { DEFAULT_SHADER } from "@/lib/shaders/defaultShader";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import usePublishState from "@/components/creator/usePublishState";

// Shader lessons aren't categorised; the save route still expects these keys,
// so send empty defaults.
const NO_SELECTION = {
  areas: [],
  topics: [],
  tags: [],
  languages: [],
  difficulty: "",
};

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
          ? "border-fuchsia-400 text-fuchsia-400"
          : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function ShaderCreator({
  project,
  publishedId: initialPublishedId = null,
  publishState: initialPublishState = "draft",
}) {
  const saved = project.data ?? {};

  // The workspace is the default view; the Markdown creator is one tab away.
  const [view, setView] = useState("workspace");

  // `baselineCode` is what the project was opened with (what "reset" returns to).
  // `code` is the live copy reported by the playground. `seed` is what the
  // workspace mounts with each time it's shown, so coming back from the
  // markdown tab restores the latest code.
  const [baselineCode] = useState(() => saved.code ?? DEFAULT_SHADER);
  const [code, setCode] = useState(baselineCode);
  const [seed, setSeed] = useState(baselineCode);

  const [title, setTitle] = useState(project.title ?? "");
  const [summary, setSummary] = useState(saved.summary ?? "");
  const [blocks, setBlocks] = useState(
    Array.isArray(saved.blocks)
      ? saved.blocks
      : [newTextBlock({ size: "title", bold: true })]
  );
  const [status, setStatus] = useState(null);
  const [publishedId, setPublishedId] = useState(initialPublishedId);

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const hasText = markdown.trim() !== "";

  const draftData = { summary, code, blocks };

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
    if (next === "workspace") setSeed(code);
    setView(next);
  }

  async function handlePublish() {
    const snap = JSON.stringify({ title, data: draftData }); // what this publish actually sends
    setStatus("saving");

    try {
      const res = await fetch("/api/shader-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title,
          summary,
          ...NO_SELECTION,
          starterCode: code,
          blocks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setPublishedId(data.id);
      markPublished(snap);
      setStatus({ ok: data.id });
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  // Lesson pane = live preview of the markdown tab. Only passed once there's
  // text, so someone making a personal project isn't shown an empty lesson pane.
  const lessonProps = hasText
    ? {
        lessonTitle: title.trim() || "Untitled lesson",
        lessonContent: <LessonPreview source={markdown} />,
      }
    : {};

  return (
    <div className="flex h-full w-full flex-col">
      {!project.canEdit && (
        <p className="shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          You're viewing someone else's project. It's read-only, and nothing you
          do here is saved.
        </p>
      )}

      {/* Same bar in both views, so the tabs never move. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
        <Link
          href="/create"
          className="font-mono text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← /create
        </Link>

        <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
          /create/shader
        </span>

        <div
          role="tablist"
          aria-label="Project view"
          className="flex items-center gap-1.5"
        >
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
              className={`font-mono text-xs ${saveState === "error" ? "text-red-400" : "text-zinc-500"}`}
            >
              {STATUS_TEXT[saveState]}
            </span>
          </>
        )}
      </div>

      {view === "workspace" ? (
        // Mounted fresh each time it's shown (not hidden with CSS), so the
        // playground always measures a visible container.
        <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
          <ShaderPlayground
            initialCode={seed}
            resetCode={baselineCode}
            onCodeChange={setCode}
            {...lessonProps}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-2xl font-semibold">Create a shader lesson</h1>

            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Add the lesson text and details. The starter shader is whatever is
              in the workspace.
            </p>

            <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Starter shader: {code.split("\n").length} lines
              </p>

              <button
                type="button"
                onClick={() => changeView("workspace")}
                className="shrink-0 font-mono text-sm text-fuchsia-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-500 dark:text-fuchsia-400"
              >
                open workspace
              </button>
            </div>

            <fieldset
              disabled={!project.canEdit}
              className="m-0 min-w-0 border-0 p-0"
            >
              {/* Lesson details */}
              <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
                <h2 className="mb-4 font-mono text-sm text-zinc-500">
                  lesson details
                </h2>

                <label
                  className="block text-sm font-medium"
                  htmlFor="shader-title"
                >
                  Title
                </label>

                <input
                  id="shader-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Your First Fragment Shader"
                  className="mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />

                <label
                  className="block text-sm font-medium"
                  htmlFor="shader-summary"
                >
                  Summary
                </label>

                <input
                  id="shader-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="One line shown in the shader lesson list"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </section>

              <TextBlockEditor
                blocks={blocks}
                onChange={setBlocks}
                accent="fuchsia"
              />

              {/* Markdown preview */}
              <details className="mt-6 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                <summary className="cursor-pointer select-none font-mono text-sm text-zinc-500">
                  preview generated markdown
                </summary>

                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                  {markdown || "(nothing yet)"}
                </pre>
              </details>

              {/* Publish button */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={status === "saving" || !title.trim()}
                  className="rounded-md bg-fuchsia-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
                >
                  {status === "saving"
                    ? "publishing..."
                    : publishState === "draft"
                      ? "$ publish shader lesson"
                      : "$ update shader lesson"}
                </button>

                {publishedId && status !== "saving" && !status?.error && (
                  <p className={`text-sm ${publishState === "edited" ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400"}`}>
                    {publishState === "edited" ? "Published, with unpublished edits." : "Published."}{" "}
                    <span className="font-mono">{publishedId}</span>
                  </p>
                )}

                {status?.error && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {status.error}
                  </p>
                )}
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </div>
  );
}