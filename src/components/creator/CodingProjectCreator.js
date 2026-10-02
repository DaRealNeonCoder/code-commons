"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TextBlockEditor, { newTextBlock } from "@/components/creator/TextBlockEditor";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import useProjectAutosave from "@/components/creator/useProjectAutosave";
import ProjectBar from "@/components/creator/ProjectBar";

const fieldClass = "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

const LANGUAGES = [
  { id: "python", label: "Python", placeholder: 'print("Hello, world!")\n' },
  {
    id: "cpp",
    label: "C++",
    placeholder: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!\\n";\n    return 0;\n}\n`,
  },
  { id: "rust", label: "Rust", placeholder: `fn main() {\n    println!("Hello, world!");\n}\n` },
];

export default function CodingProjectCreator({ project }) {
  const saved = project.data ?? {};

  const [title, setTitle] = useState(project.title ?? "");
  const [language, setLanguage] = useState(
    LANGUAGES.some((l) => l.id === saved.language) ? saved.language : "python"
  );
  const [starterCode, setStarterCode] = useState(saved.starterCode ?? "");
  const [blocks, setBlocks] = useState(
    Array.isArray(saved.blocks) ? saved.blocks : [newTextBlock({ size: "title", bold: true })]
  );

  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const currentLanguage = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0];

  // `content` (the generated markdown) is saved alongside `blocks` so the public
  // /projects/[id] page can render it without needing the block editor.
  const saveState = useProjectAutosave({
    projectId: project.id,
    enabled: project.canEdit,
    title,
    data: { language, starterCode, blocks, content: markdown },
  });

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/create" className="font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          ← /create
        </Link>
        <ProjectBar
          label="/create/project"
          accentClass="text-emerald-600 dark:text-emerald-400"
          saveState={saveState}
          canEdit={project.canEdit}
        />
        <h1 className="mt-1 text-2xl font-semibold">Create a coding project</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Same block editor as puzzles, but with no tests. Write a description, pick a language, and
          people can read it and run code next to it.
        </p>
        <p className="mt-2 text-sm">
          <Link
            href={`/projects/${project.id}`}
            className="font-mono text-emerald-600 hover:underline dark:text-emerald-400"
          >
            view project page →
          </Link>
        </p>

        <fieldset disabled={!project.canEdit} className="m-0 min-w-0 border-0 p-0">
          <section className="mt-8 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="mb-4 font-mono text-sm text-zinc-500">project details</h2>

            <label className="block text-sm font-medium" htmlFor="project-title">
              Title
            </label>
            <input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Snake Game"
              className={`mb-4 ${fieldClass}`}
            />

            <label className="block text-sm font-medium" htmlFor="project-language">
              Language
            </label>
            <select
              id="project-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`mb-4 ${fieldClass}`}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium" htmlFor="project-code">
              Code
            </label>
            <p className="text-xs text-zinc-500">
              Viewers get the editor locked to {currentLanguage.label}, pre-filled with this code. They can edit and
              run it, but their changes aren&apos;t saved to your project.
            </p>
            <textarea
              id="project-code"
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder={currentLanguage.placeholder}
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

          <p className="mt-6 text-sm text-zinc-500">Changes save automatically.</p>
        </fieldset>
      </div>
    </div>
  );
}