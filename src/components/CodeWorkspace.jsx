"use client";

import { useState } from "react";
import Link from "next/link";
import CodeEditor from "@/components/CodeEditor";

const ACCENTS = {
  amber: { dot: "bg-amber-400", link: "text-amber-600 dark:text-amber-400 hover:underline" },
  teal: { dot: "bg-teal-400", link: "text-teal-600 dark:text-teal-400 hover:underline" },
};

const LANGUAGES = [
  { id: "python", label: "Python", ext: "py" },
  { id: "cpp", label: "C++", ext: "cpp" },
  { id: "rust", label: "Rust", ext: "rs" },
];

const EMPTY_STARTER = {
  python: "# no starter code yet\n",
  cpp: "// no starter code yet\n",
  rust: "// no starter code yet\n",
};

function languageInfo(id) {
  return LANGUAGES.find((lang) => lang.id === id) || LANGUAGES[0];
}

// `starterCode` is a map like { python: "...", cpp: "...", rust: "..." } —
// any language it doesn't include falls back to a small placeholder.
//
// Pass `lockedLanguage` (e.g. "python") for content that's inherently
// about one specific language — this hides the picker entirely and always
// uses that language, ignoring the others.
//
// IMPORTANT: give this component a `key` (e.g. key={lesson.id}) wherever
// it's rendered from a dynamic route, so switching between two lessons/
// puzzles fully resets its state instead of reusing the previous instance.
export default function CodeWorkspace({
  fileBaseName = "main",
  starterCode = {},
  description,
  backHref,
  backLabel,
  accent = "amber",
  lockedLanguage,
}) {
  const initialLanguage = lockedLanguage || Object.keys(starterCode)[0] || "python";
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(starterCode[initialLanguage] || EMPTY_STARTER[initialLanguage]);
  const [output, setOutput] = useState("Output will appear here...");
  const [isRunning, setIsRunning] = useState(false);

  const colors = ACCENTS[accent] || ACCENTS.amber;
  const showLanguagePicker = !lockedLanguage;
  const current = languageInfo(language);

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    setCode(starterCode[nextLanguage] || EMPTY_STARTER[nextLanguage]);
    setOutput("Output will appear here...");
  }

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setOutput(data.error ? `Error: ${data.error}` : data.stdout || data.stderr || "(no output)");
    } catch (err) {
      setOutput(`Network error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* Left: lesson / puzzle prompt */}
      <div className="w-1/2 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-900">
        {backHref && (
          <Link href={backHref} className={`mb-6 inline-block font-mono text-sm ${colors.link}`}>
            ← {backLabel}
          </Link>
        )}
        {description}
      </div>

      {/* Right: toolbar + editor + output */}
      <div className="w-1/2 flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2">
          <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
            <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
            {fileBaseName}.{current.ext}
          </span>

          <div className="flex items-center gap-2">
            {showLanguagePicker && (
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isRunning ? "Running..." : "Run ▶"}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <CodeEditor code={code} onChange={setCode} language={current.id} />
        </div>
        <div className="h-32 overflow-y-auto border-t border-zinc-800 bg-black p-4 font-mono text-sm text-green-400">
          {output}
        </div>
      </div>
    </div>
  );
}
