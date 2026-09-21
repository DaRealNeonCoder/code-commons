"use client";

import { useEffect, useState } from "react";
import ShaderEditor from "./ShaderEditor";
import ShaderCanvas from "./ShaderCanvas";
import { DEFAULT_SHADER } from "@/lib/shaders/defaultShader";

const DEBOUNCE_MS = 400;

export default function ShaderPlayground() {
  const [code, setCode] = useState(DEFAULT_SHADER);
  const [debouncedCode, setDebouncedCode] = useState(DEFAULT_SHADER);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | { id } | { error }

  // Sensible debouncing so we don't recompile on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCode(code), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code]);

  function handleCodeChange(nextCode) {
    setCode(nextCode);
    setSaveStatus(null); // a stale "saved" message would be misleading after further edits
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/shaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveStatus({ error: data.error || "Save failed." });
        return;
      }
      setSaveStatus({ id: data.id });
    } catch (err) {
      setSaveStatus({ error: `Network error: ${err.message}` });
    }
  }

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
          Shader Playground
        </span>

        <div className="flex items-center gap-3">
          {saveStatus && typeof saveStatus === "object" && (
            <span className={`font-mono text-xs ${saveStatus.error ? "text-red-400" : "text-fuchsia-400"}`}>
              {saveStatus.error ? saveStatus.error : `saved as ${saveStatus.id}`}
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="rounded border border-zinc-700 px-3 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-fuchsia-400 hover:text-fuchsia-400 disabled:opacity-50"
          >
            {saveStatus === "saving" ? "saving..." : "save"}
          </button>

          <button
            type="button"
            onClick={() => handleCodeChange(DEFAULT_SHADER)}
            className="rounded border border-zinc-700 px-3 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-fuchsia-400 hover:text-fuchsia-400"
          >
            reset
          </button>
        </div>
      </div>

      {/* Canvas (left) + editor (right) — stacked on small screens */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <div className="flex-1 min-h-0 overflow-hidden md:w-1/2">
          <ShaderCanvas fragmentSource={debouncedCode} onError={setError} onCompiled={() => setError(null)} />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden border-t border-zinc-800 md:w-1/2 md:border-l md:border-t-0">
          <ShaderEditor code={code} onChange={handleCodeChange} />
        </div>
      </div>

      {/* Errors / compilation messages */}
      <div className="h-28 overflow-y-auto border-t border-zinc-800 bg-black p-4 font-mono text-sm">
        {error ? (
          <pre className="whitespace-pre-wrap text-red-400">{error}</pre>
        ) : (
          <span className="text-zinc-600"># no errors</span>
        )}
      </div>
    </div>
  );
}
