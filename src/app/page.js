"use client";

import { useState } from "react";
import CodeEditor from "@/components/CodeEditor";

const STARTER_CODE = `print("Hello, World!")`;

export default function Home() {
  const [code, setCode] = useState(STARTER_CODE);
  const [output, setOutput] = useState("Output will appear here...");
  const [isRunning, setIsRunning] = useState(false);


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
      {/* Left: lesson */}
      <div className="w-1/2 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold mb-4">Python: Hello, World!</h1>
        <p className="mb-4">
          Python is a simple, readable language. To print text, use the{" "}
          <code>print()</code> function:
        </p>
        <pre className="bg-black text-white rounded p-3 text-sm">
          <code>print(&quot;Hello, World!&quot;)</code>
        </pre>
        <p className="mt-4">Edit the code on the right, then click Run.</p>
      </div>

      {/* Right: toolbar + editor + output */}
      <div className="w-1/2 flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b px-4 py-2 bg-white dark:bg-zinc-950">
          <span className="text-sm font-medium">main.py</span>
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
        <div className="h-32 overflow-y-auto border-t bg-black p-4 font-mono text-sm text-green-400">
          {output}
        </div>
      </div>
    </div>
  );
}