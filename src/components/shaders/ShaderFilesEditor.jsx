"use client";

import { useState } from "react";
import ShaderEditor from "./ShaderEditor";

const FILES = [
  ["cpu", "scene.js", "javascript"],
  ["vertex", "vertex.glsl", "glsl"],
  ["fragment", "fragment.glsl", "glsl"],
];

export default function ShaderFilesEditor({ files, onChange }) {
  const [active, setActive] = useState("cpu");
  const [, , language] = FILES.find(([key]) => key === active) || FILES[0];

  function update(value) {
    onChange({ ...files, [active]: value });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2 py-1.5" role="tablist" aria-label="Graphics source files">
        {FILES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setActive(key)}
            className={`rounded px-2 py-1 font-mono text-xs ${active === key ? "bg-fuchsia-500/15 text-fuchsia-300" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <ShaderEditor code={files[active] || ""} onChange={update} language={language} />
      </div>
    </div>
  );
}
