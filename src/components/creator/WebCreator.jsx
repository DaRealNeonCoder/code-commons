"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import WebPlayground from "@/components/web/WebPlayground";
import LessonPreview from "@/components/creator/LessonPreview";
import PublishBadge from "@/components/creator/PublishBadge";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import usePublishState from "@/components/creator/usePublishState";

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
          ? "border-orange-400 text-orange-400"
          : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function WebCreator({
  project,
  publishedId: initialPublishedId = null,
  publishState: initialPublishState = "draft",
}) {
  const saved = project.data ?? {};

  const [view, setView] = useState("workspace");

  const [baselineHtml] = useState(() => saved.html ?? DEFAULT_HTML);
  const [html, setHtml] = useState(baselineHtml);
  const [seedHtml, setSeedHtml] = useState(baselineHtml);

  const [baselineCss] = useState(() => saved.css ?? DEFAULT_CSS);
  const [css, setCss] = useState(baselineCss);
  const [seedCss, setSeedCss] = useState(baselineCss);

  const [baselineJs] = useState(() => saved.js ?? DEFAULT_JS);
  const [js, setJs] = useState(baselineJs);
  const [seedJs, setSeedJs] = useState(baselineJs);

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

  const draftData = {
    summary,
    html,
    css,
    js,
    blocks,
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
    if (next === "workspace") {
      setSeedHtml(html);
      setSeedCss(css);
      setSeedJs(js);
    }
    setView(next);
  }

  async function handlePublish() {
    const snap = JSON.stringify({ title, data: draftData });
    setStatus("saving");

    try {
      const res = await fetch("/api/web-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          publish: true,
          title,
          snapshot: snap,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { id } = await res.json();
      setPublishedId(id);
      markPublished();
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      console.error("Publish failed:", err);
    }
  }

  const canPublish = project.canEdit && hasText;

  return (
    <div className="flex h-full w-full">
      {view === "workspace" ? (
        <WebPlayground
          key={`${seedHtml}-${seedCss}-${seedJs}`}
          lessonTitle={title}
          initialHtml={seedHtml}
          initialCss={seedCss}
          initialJs={seedJs}
          resetHtml={baselineHtml}
          resetCss={baselineCss}
          resetJs={baselineJs}
          onCodeChange={(code) => {
            setHtml(code.html);
            setCss(code.css);
            setJs(code.js);
          }}
        />
      ) : (
        <div className="h-full w-full overflow-y-auto px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex gap-2">
              <ViewTab
                label="workspace"
                active={false}
                onClick={() => changeView("workspace")}
              />
              <ViewTab
                label="details"
                active={true}
                onClick={() => {}}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-zinc-600">
                {STATUS_TEXT[saveState.status]}
              </span>
              {publishedId && <PublishBadge state={publishState} />}
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className={`rounded px-4 py-2 font-mono text-sm transition-colors ${
                  canPublish
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                {publishedId ? "update" : "publish"}
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-2xl">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-300">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-300">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                rows={3}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-300">Description</label>
              <div className="mt-2">
                <TextBlockEditor
                  blocks={blocks}
                  onChange={setBlocks}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
