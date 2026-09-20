"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";

const SIZE_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "subtitle", label: "Subtitle" },
  { value: "normal", label: "Normal" },
];

const SIZE_TEXT_CLASS = {
  title: "text-2xl",
  subtitle: "text-lg",
  normal: "text-base",
};

function newBlock(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    size: "normal",
    bold: false,
    content: "",
    ...overrides,
  };
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function LessonCreator({ taxonomy, groupedTopics, groupedTags }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [starterCode, setStarterCode] = useState('print("Hello, World!")\n');
  const [blocks, setBlocks] = useState([
    newBlock({ size: "title", bold: true }),
    newBlock({ size: "normal" }),
  ]);

  const [areas, setAreas] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tags, setTags] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [difficulty, setDifficulty] = useState("");

  const [status, setStatus] = useState(null); // null | "saving" | { ok } | { error }

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);

  function updateBlock(id, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function addBlock() {
    setBlocks((prev) => [...prev, newBlock()]);
  }

  function moveBlock(id, direction) {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
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
          title,
          summary,
          starterCode,
          content: markdown,
          areas,
          topics,
          tags,
          languages,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus({ ok: data.id });
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  const canSave = title.trim() && difficulty && status !== "saving";

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-sm text-violet-600 dark:text-violet-400">/create</p>
        <h1 className="mt-1 text-2xl font-semibold">Create a lesson</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Build a lesson from text blocks — no Markdown syntax required.
        </p>

        {/* Lesson details */}
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
            placeholder="One line shown in search results"
            className="mt-1 mb-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />

          <label className="block text-sm font-medium" htmlFor="lesson-starter">
            Starter code
          </label>
          <textarea
            id="lesson-starter"
            value={starterCode}
            onChange={(e) => setStarterCode(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-zinc-300 bg-zinc-950 px-3 py-2 font-mono text-sm text-green-400 dark:border-zinc-700"
          />
        </section>

        {/* Taxonomy — fixed vocabulary only, nothing freeform */}
        <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-1 font-mono text-sm text-zinc-500">categorize this lesson</h2>
          <p className="mb-4 text-xs text-zinc-500">
            These options are set by the site — you can't type a new one in here.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">
                Difficulty <span className="text-red-500">*</span>
              </p>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Select difficulty...</option>
                {taxonomy.difficulties.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Language(s)</p>
              <div className="flex flex-wrap gap-3">
                {taxonomy.languages.map((lang) => (
                  <label key={lang.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={languages.includes(lang.id)}
                      onChange={() => setLanguages((prev) => toggle(prev, lang.id))}
                      className="accent-violet-600"
                    />
                    {lang.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-zinc-500">Leave unchecked if the lesson is language-independent.</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Area(s)</p>
              <div className="flex flex-col gap-1">
                {taxonomy.areas.map((area) => (
                  <label key={area.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={areas.includes(area.id)}
                      onChange={() => setAreas((prev) => toggle(prev, area.id))}
                      className="accent-violet-600"
                    />
                    {area.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Topic(s)</p>
              <div className="max-h-48 overflow-y-auto pr-1">
                {groupedTopics.map(({ area, topics: areaTopics }) =>
                  areaTopics.length === 0 ? null : (
                    <div key={area.id} className="mb-2">
                      <p className="mb-1 text-xs font-medium text-zinc-400">{area.label}</p>
                      {areaTopics.map((topic) => (
                        <label key={topic.id} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={topics.includes(topic.id)}
                            onChange={() => setTopics((prev) => toggle(prev, topic.id))}
                            className="accent-violet-600"
                          />
                          {topic.label}
                        </label>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">Tag(s) / Concept(s)</p>
              <div className="max-h-48 overflow-y-auto pr-1">
                {groupedTags.map(({ topic, tags: topicTags }) =>
                  topicTags.length === 0 ? null : (
                    <div key={topic.id} className="mb-2">
                      <p className="mb-1 text-xs font-medium text-zinc-400">{topic.label}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {topicTags.map((tag) => (
                          <label key={tag.id} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={tags.includes(tag.id)}
                              onChange={() => setTags((prev) => toggle(prev, tag.id))}
                              className="accent-violet-600"
                            />
                            {tag.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                A concept can appear under more than one topic — that's expected.
              </p>
            </div>
          </div>
        </section>

        {/* Content blocks */}
        <section className="mt-6">
          <h2 className="mb-3 font-mono text-sm text-zinc-500">content</h2>

          <div className="space-y-4">
            {blocks.map((block, i) => (
              <div key={block.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateBlock(block.id, { bold: !block.bold })}
                    aria-pressed={block.bold}
                    title="Bold"
                    className={`rounded px-2.5 py-1 font-mono text-xs font-bold transition-colors ${
                      block.bold
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    B
                  </button>

                  <select
                    value={block.size}
                    onChange={(e) => updateBlock(block.id, { size: e.target.value })}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, -1)}
                      disabled={i === 0}
                      title="Move up"
                      className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, 1)}
                      disabled={i === blocks.length - 1}
                      title="Move down"
                      className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      delete
                    </button>
                  </div>
                </div>

                <textarea
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  placeholder={block.size === "title" ? "Lesson title..." : "Write here..."}
                  rows={block.size === "normal" ? 3 : 1}
                  className={`w-full resize-y rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 ${SIZE_TEXT_CLASS[block.size]} ${
                    block.bold ? "font-bold" : ""
                  }`}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addBlock}
            className="mt-4 rounded-md border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-violet-400 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            + Add text block
          </button>
        </section>

        {/* Generated markdown preview */}
        <details className="mt-6 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer select-none font-mono text-sm text-zinc-500">
            preview generated markdown
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {markdown || "(nothing yet)"}
          </pre>
        </details>

        {/* Save */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-violet-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {status === "saving" ? "saving..." : "$ save lesson"}
          </button>

          {!difficulty && title.trim() && (
            <p className="text-sm text-zinc-500">Pick a difficulty to enable saving.</p>
          )}

          {status?.ok && (
            <p className="text-sm text-teal-600 dark:text-teal-400">
              Saved.{" "}
              <Link href={`/lessons/${status.ok}`} className="underline">
                View it
              </Link>
              .
            </p>
          )}
          {status?.error && <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>}
        </div>
      </div>
    </div>
  );
}
