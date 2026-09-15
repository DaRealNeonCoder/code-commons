"use client";

import { useState } from "react";
import Link from "next/link";
import CodeEditor from "@/components/CodeEditor";

const ACCENTS = {
  amber: { dot: "bg-amber-400", link: "text-amber-600 dark:text-amber-400 hover:underline" },
  teal: { dot: "bg-teal-400", link: "text-teal-600 dark:text-teal-400 hover:underline" },
};

// Same run/output behavior as the original page.js, just generalized so it
// can render a lesson's teaching content OR a puzzle's prompt on the left.
export default function CodeWorkspace({
  fileName = "main.py",
  starterCode,
  description,
  backHref,
  backLabel,
  accent = "amber",
}) {
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState("Output will appear here...");
  const [isRunning, setIsRunning] = useState(false);
  const colors = ACCENTS[accent] || ACCENTS.amber;

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
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
            {fileName}
          </span>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run ▶"}
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <CodeEditor code={code} onChange={setCode} />
        </div>
        <div className="h-32 overflow-y-auto border-t border-zinc-800 bg-black p-4 font-mono text-sm text-green-400">
          {output}
        </div>
      </div>
    </div>
  );
}
