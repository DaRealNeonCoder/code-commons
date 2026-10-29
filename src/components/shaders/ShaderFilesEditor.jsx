"use client";

import { useState } from "react";
import ShaderEditor from "./ShaderEditor";
import {
  DEFAULT_PROGRAMMABLE_FRAGMENT,
  DEFAULT_PROGRAMMABLE_VERTEX,
  PROGRAMMABLE_ENTRY,
  fileKindOf,
  validateFileName,
} from "@/lib/shaders/programmable3d";

const SCRIPT_STARTER = "// Shared helpers. Load this file from another script with require().\nmodule.exports = {};\n";

function starterFor(name) {
  const kind = fileKindOf(name)?.kind;
  if (kind === "vertex") return DEFAULT_PROGRAMMABLE_VERTEX;
  if (kind === "fragment") return DEFAULT_PROGRAMMABLE_FRAGMENT;
  return SCRIPT_STARTER;
}

function languageFor(name) {
  return fileKindOf(name)?.kind === "script" ? "javascript" : "glsl";
}

export default function ShaderFilesEditor({ files, onChange }) {
  const [active, setActive] = useState(PROGRAMMABLE_ENTRY);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState(null);

  const names = Object.keys(files);
  const current = names.includes(active) ? active : PROGRAMMABLE_ENTRY;

  function update(value) {
    onChange({ ...files, [current]: value });
  }

  function addFile(event) {
    event.preventDefault();
    const name = draft.trim();
    const error = validateFileName(name, files);
    if (error) {
      setAddError(error);
      return;
    }
    onChange({ ...files, [name]: starterFor(name) });
    setActive(name);
    setDraft("");
    setAddError(null);
    setAdding(false);
  }

  function removeCurrent() {
    if (current === PROGRAMMABLE_ENTRY) return;
    const next = { ...files };
    delete next[current];
    onChange(next);
    setActive(PROGRAMMABLE_ENTRY);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2 py-1.5" role="tablist" aria-label="Graphics source files">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={current === name}
            onClick={() => setActive(name)}
            className={`rounded px-2 py-1 font-mono text-xs ${current === name ? "bg-fuchsia-500/15 text-fuchsia-300" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setAdding((open) => !open);
            setAddError(null);
          }}
          aria-expanded={adding}
          className="rounded px-2 py-1 font-mono text-xs text-zinc-500 hover:text-zinc-300"
        >
          + file
        </button>
        {current !== PROGRAMMABLE_ENTRY && (
          <button
            type="button"
            onClick={removeCurrent}
            className="ml-auto rounded px-2 py-1 font-mono text-xs text-zinc-500 hover:text-red-400"
          >
            Delete {current}
          </button>
        )}
      </div>
      {adding && (
        <form onSubmit={addFile} className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-2 py-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="shaders/glow.frag"
            aria-label="New file name"
            aria-invalid={addError ? true : undefined}
            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-fuchsia-500 focus:outline-none"
          />
          <button type="submit" className="rounded bg-fuchsia-500/15 px-2 py-1 font-mono text-xs text-fuchsia-300 hover:bg-fuchsia-500/25">
            Add
          </button>
          {addError && <p className="w-full font-mono text-[11px] text-red-400">{addError}</p>}
        </form>
      )}
      <div className="min-h-0 flex-1">
        <ShaderEditor code={files[current] || ""} onChange={update} language={languageFor(current)} />
      </div>
    </div>
  );
}
