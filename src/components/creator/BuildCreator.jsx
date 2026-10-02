"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import FilterFields from "@/components/filters/FilterFields";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import ProjectBar from "@/components/creator/ProjectBar";

const fieldClass = "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

// Same languages CodeWorkspace can run.
const STARTER_LANGUAGES = [
  { id: "python", label: "Python", placeholder: 'print("Hello from my build!")\n' },
  {
    id: "cpp",
    label: "C++",
    placeholder: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from my build!\\n";\n}\n',
  },
  { id: "rust", label: "Rust", placeholder: 'fn main() {\n    println!("Hello from my build!");\n}\n' },
];

// Accepts a plain string (treated as Python) or { python, cpp, rust }.
function normalizeStarter(value) {
  if (typeof value === "string") return { python: value };
  const out = {};
  if (value && typeof value === "object") {
    for (const { id } of STARTER_LANGUAGES) {
      if (typeof value[id] === "string") out[id] = value[id];
    }
  }
  return out;
}

export default function BuildCreator({ project }) {
  const saved = project.data ?? {};

  const [title, setTitle] = useState(project.title ?? "");
  const [starterCode, setStarterCode] = useState(() => normalizeStarter(saved.starterCode));
  const [starterLang, setStarterLang] = useState("python");
  const [blocks, setBlocks] = useState(
    Array.isArray(saved.blocks) ? saved.blocks : [newTextBlock({ size: "title", bold: true })]
  );
  const [status, setStatus] = useState(null);
  // Id of the public page once saved. Stored with the project so the link survives a reload.
  const [publishedId, setPublishedId] = useState(saved.publishedId ?? null);

  // These come from the same taxonomy the search bar filters against.
  const [areas, setAreas] = useState(saved.areas ?? []);
  const [topics, setTopics] = useState(saved.topics ?? []);
  const [tags, setTags] = useState(saved.tags ?? []);
  const [languages, setLanguages] = useState(saved.languages ?? []);
  const [difficulty, setDifficulty] = useState(saved.difficulty ?? "");

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const activeLanguage = STARTER_LANGUAGES.find((l) => l.id === starterLang) ?? STARTER_LANGUAGES[0];

  const saveState = useProjectAutosave({
    projectId: project.id,
    enabled: project.canEdit,
    title,
    data: { starterCode, blocks, areas, topics, tags, languages, difficulty, publishedId },
  });

  async function handleSave() {
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
          content: markdown,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setPublishedId(data.id);
      setStatus({ ok: true });
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
          label="/create/build"
          accentClass="text-indigo-600 dark:text-indigo-400"
          saveState={saveState}
          canEdit={project.canEdit}
        />
        <h1 className="mt-1 text-2xl font-semibold">Create a build</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Show off something you made. Write about it on the left; visitors can run and tweak your code on the right.
        </p>

        <fieldset disabled={!project.canEdit} className="m-0 min-w-0 border-0 p-0">
          <section className="mt-8 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="mb-4 font-mono text-sm text-zinc-500">build details</h2>

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

            <label className="block text-sm font-medium" htmlFor="build-starter">
              Code
            </label>
            <p className="text-xs text-zinc-500">
              Visitors start from this code. They can edit and run it, but their changes are never saved. If you fill in
              only one language, the editor is locked to it.
            </p>
            <div role="tablist" aria-label="Code language" className="mt-2 flex gap-1">
              {STARTER_LANGUAGES.map((lang) => {
                const active = lang.id === starterLang;
                const hasCode = Boolean(starterCode[lang.id]?.trim());
                return (
                  <button
                    key={lang.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStarterLang(lang.id)}
                    className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                      active
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "border-zinc-300 text-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:hover:text-zinc-100"
                    }`}
                  >
                    {lang.label}
                    {hasCode ? " •" : ""}
                  </button>
                );
              })}
            </div>
            <textarea
              id="build-starter"
              value={starterCode[starterLang] ?? ""}
              onChange={(e) => setStarterCode((prev) => ({ ...prev, [starterLang]: e.target.value }))}
              rows={10}
              spellCheck={false}
              placeholder={activeLanguage.placeholder}
              className={`${fieldClass} bg-zinc-950 font-mono text-green-400`}
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

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving" || !title.trim() || !difficulty}
              className="rounded-md bg-indigo-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === "saving" ? "saving..." : "$ save build"}
            </button>

            {publishedId && status !== "saving" && !status?.error && (
              <p className="text-sm text-indigo-600 dark:text-indigo-400">
                {status?.ok ? "Saved. " : "Published. "}
                <Link href={`/builds/${publishedId}`} className="underline">
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