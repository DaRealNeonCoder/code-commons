"use client";

import { useState } from "react";

// Organizes the shader page into named regions (Lesson, Sandbox). Plain
// useState rather than native <details> — the Sandbox section needs to
// flex-grow to fill the remaining viewport height while open, which native
// <details> can't express on its own.
export default function CollapsibleSection({ title, defaultOpen = true, growWhenOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`flex flex-col border-b border-zinc-800 ${open && growWhenOpen ? "flex-1 min-h-0" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-4 py-2.5 font-mono text-sm text-zinc-100 transition-colors hover:bg-zinc-900"
      >
        <span className="text-fuchsia-400">{open ? "▾" : "▸"}</span>
        {title}
      </button>

      {open && (
        <div className={growWhenOpen ? "flex flex-1 min-h-0 flex-col" : "max-h-64 overflow-y-auto px-4 pb-4"}>
          {children}
        </div>
      )}
    </div>
  );
}