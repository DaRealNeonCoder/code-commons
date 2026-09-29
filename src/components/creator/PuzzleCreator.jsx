"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import TestCaseEditor from "@/components/creator/TestCaseEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import FilterFields from "@/components/filters/FilterFields";

const fieldClass = "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

export default function PuzzleCreator() {
  const [title, setTitle] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [blocks, setBlocks] = useState([newTextBlock({ size: "title", bold: true })]);
  const [testCases, setTestCases] = useState([]);
  const [status, setStatus] = useState(null);

  // Replaces the old hardcoded CATEGORIES/DIFFICULTIES dropdowns — these now
  // come from the same taxonomy the search bar filters against.
  const [areas, setAreas] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tags, setTags] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [difficulty, setDifficulty] = useState("");

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const hasIncompleteTest = testCases.some((t) => !t.expected.trim());

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/puzzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          difficulty,
          areas,
          topics,
          tags,
          languages,
          starterCode,
          content: markdown,
          // Drop the client-only row key.
          testCases: testCases.map(({ input, expected, hidden }) => ({ input, expected, hidden })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus({ ok: data });
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
        <p className="mt-3 font-mono text-sm text-teal-600 dark:text-teal-400">/create/puzzle</p>
        <h1 className="mt-1 text-2xl font-semibold">Create a puzzle</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Same block editor as lessons, plus difficulty, topic filters and test cases.
        </p>

        <section className="mt-8 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-4 font-mono text-sm text-zinc-500">puzzle details</h2>

          <label className="block text-sm font-medium" htmlFor="puzzle-title">
            Title
          </label>
          <input
            id="puzzle-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Two Sum"
            className={`mb-4 ${fieldClass}`}
          />

          <div className="mb-4">
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

          <label className="block text-sm font-medium" htmlFor="puzzle-starter">
            Starter code
          </label>
          <p className="text-xs text-zinc-500">
            Tests feed stdin, so include the input-reading scaffold and let the learner fill in the function.
          </p>
          <textarea
            id="puzzle-starter"
            value={starterCode}
            onChange={(e) => setStarterCode(e.target.value)}
            rows={6}
            placeholder={"def solution(n):\n    pass\n\nn = int(input())\nprint(solution(n))\n"}
            className={`${fieldClass} bg-zinc-950 font-mono text-green-400`}
          />
        </section>

        <TextBlockEditor blocks={blocks} onChange={setBlocks} accent="teal" />

        <TestCaseEditor testCases={testCases} onChange={setTestCases} />

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
            disabled={status === "saving" || !title.trim() || !difficulty || hasIncompleteTest}
            className="rounded-md bg-teal-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {status === "saving" ? "saving..." : "$ save puzzle"}
          </button>

          {hasIncompleteTest && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Every test case needs an expected output (or remove it).
            </p>
          )}
          {status?.ok && (
            <p className="text-sm text-teal-600 dark:text-teal-400">
              Saved.{" "}
              <Link href={`/puzzles/${status.ok.id}`} className="underline">
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