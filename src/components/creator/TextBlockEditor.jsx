"use client";

const SIZE_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "subtitle", label: "Subtitle" },
  { value: "normal", label: "Normal" },
];

const SIZE_TEXT_CLASS = {
  title: "text-2xl",
  subtitle: "text-lg",
  normal: "text-base",
};

// Full literal class strings per accent — Tailwind's scanner needs to see
// these exact strings somewhere in source, so they can't be built with
// template interpolation like `hover:text-${accent}-600`.
const ACCENT_HOVER = {
  amber: "hover:border-amber-400 hover:text-amber-600",
  teal: "hover:border-teal-400 hover:text-teal-600",
  fuchsia: "hover:border-fuchsia-400 hover:text-fuchsia-600",
  blue: "hover:border-blue-400 hover:text-blue-600",
  violet: "hover:border-violet-400 hover:text-violet-600",
};

export function newTextBlock(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    size: "normal",
    bold: false,
    content: "",
    ...overrides,
  };
}

export default function TextBlockEditor({ blocks, onChange, accent = "violet" }) {
  function updateBlock(id, patch) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function removeBlock(id) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function addBlock() {
    onChange([...blocks, newTextBlock()]);
  }
  function moveBlock(id, direction) {
    const index = blocks.findIndex((b) => b.id === id);
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  const hoverClass = ACCENT_HOVER[accent] || ACCENT_HOVER.violet;

  return (
    <section className="mt-6">
      <h2 className="mb-3 font-mono text-sm text-zinc-500">content</h2>

      <div className="space-y-4">
        {blocks.map((block, i) => (
          <div key={block.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateBlock(block.id, { bold: !block.bold })}
                aria-pressed={block.bold}
                title="Bold"
                className={`rounded px-2.5 py-1 font-mono text-xs font-bold transition-colors ${
                  block.bold
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                B
              </button>

              <select
                value={block.size}
                onChange={(e) => updateBlock(block.id, { size: e.target.value })}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              >
                {SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={i === 0}
                  title="Move up"
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={i === blocks.length - 1}
                  title="Move down"
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  delete
                </button>
              </div>
            </div>

            <textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder={block.size === "title" ? "Title..." : "Write here..."}
              rows={block.size === "normal" ? 3 : 1}
              className={`w-full resize-y rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 ${SIZE_TEXT_CLASS[block.size]} ${
                block.bold ? "font-bold" : ""
              }`}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBlock}
        className={`mt-4 rounded-md border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition-colors dark:border-zinc-700 dark:text-zinc-400 ${hoverClass}`}
      >
        + Add text block
      </button>
    </section>
  );
}