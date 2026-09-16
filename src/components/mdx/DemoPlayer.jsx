"use client";

import { useState } from "react";

export default function DemoPlayer({ demos = [] }) {
  const [active, setActive] = useState(0);
  if (demos.length === 0) return null;
  const current = demos[active];

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="aspect-video bg-black">
        {/* key forces the video element to reload when the source changes */}
        <video key={current.src} src={current.src} controls className="h-full w-full" />
      </div>
      {demos.length > 1 && (
        <div className="flex flex-wrap gap-1 border-t border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          {demos.map((demo, i) => (
            <button
              key={demo.label}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded px-3 py-1.5 font-mono text-xs transition-colors ${
                i === active
                  ? "bg-teal-600 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {demo.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
