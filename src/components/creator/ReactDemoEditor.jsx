"use client";

import ReactDemo from "@/components/mdx/ReactDemo";
import { MAX_REACT_DEMO_CODE, MAX_REACT_DEMO_TITLE } from "@/lib/reactDemo";

const sampleCode = `function Demo() {
  const [count, setCount] = React.useState(0);
  return <button onClick={() => setCount(count + 1)}>
    Clicked {count} times
  </button>;
}`;

const ADD_BUTTON_CLASS = {
  amber: "hover:border-amber-400 hover:text-amber-600",
  teal: "hover:border-teal-400 hover:text-teal-600",
  fuchsia: "hover:border-fuchsia-400 hover:text-fuchsia-600",
  blue: "hover:border-blue-400 hover:text-blue-600",
  violet: "hover:border-violet-400 hover:text-violet-600",
};

export function newReactDemo(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: "Interactive example",
    code: sampleCode,
    ...overrides,
  };
}

export function withReactDemoIds(demos) {
  return (Array.isArray(demos) ? demos : []).map((demo) => ({
    id: demo?.id || crypto.randomUUID(),
    title: typeof demo?.title === "string" ? demo.title : "",
    code: typeof demo?.code === "string" ? demo.code : "",
  }));
}

export default function ReactDemoEditor({ demos, onChange, accent = "amber" }) {
  function updateDemo(id, patch) {
    onChange(demos.map((demo) => (demo.id === id ? { ...demo, ...patch } : demo)));
  }

  function removeDemo(id) {
    onChange(demos.filter((demo) => demo.id !== id));
  }

  function addDemo() {
    onChange([...demos, newReactDemo()]);
  }

  return (
    <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm text-zinc-500">React demos</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Add an interactive component for your draft. Define a component named <code>Demo</code> (or <code>App</code>); React and JSX are available in the preview.
          </p>
        </div>
        <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          draft preview only
        </span>
      </div>

      <div className="mt-4 space-y-5">
        {demos.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No React demos yet. Add one to preview an interactive lesson example.
          </p>
        ) : (
          demos.map((demo, index) => (
            <div key={demo.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="font-mono text-xs text-zinc-500" htmlFor={`react-demo-title-${demo.id}`}>
                  demo {String(index + 1).padStart(2, "0")}
                </label>
                <button type="button" onClick={() => removeDemo(demo.id)} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                  delete
                </button>
              </div>
              <input
                id={`react-demo-title-${demo.id}`}
                value={demo.title}
                maxLength={MAX_REACT_DEMO_TITLE}
                onChange={(event) => updateDemo(demo.id, { title: event.target.value })}
                placeholder="Demo title"
                className="mb-3 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <textarea
                value={demo.code}
                maxLength={MAX_REACT_DEMO_CODE}
                onChange={(event) => updateDemo(demo.id, { code: event.target.value })}
                spellCheck={false}
                rows={10}
                className="w-full resize-y rounded border border-zinc-300 bg-zinc-950 px-3 py-2 font-mono text-xs leading-5 text-zinc-100 dark:border-zinc-700"
                aria-label={`React code for demo ${index + 1}`}
              />
              <p className="mt-2 font-mono text-[11px] text-zinc-500">{demo.code.length.toLocaleString()} / {MAX_REACT_DEMO_CODE.toLocaleString()} characters</p>
              <div className="mt-4">
                <p className="mb-2 font-mono text-xs text-zinc-500">preview</p>
                <ReactDemo code={demo.code} title={demo.title || `Demo ${index + 1}`} />
              </div>
            </div>
          ))
        )}
      </div>

      <button type="button" onClick={addDemo} className={`mt-4 rounded-md border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400 ${ADD_BUTTON_CLASS[accent] || ADD_BUTTON_CLASS.violet}`}>
        + Add React demo
      </button>

      {demos.some((demo) => demo.code.trim()) && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
          React demos can be saved in drafts and previewed here, but this lesson cannot be submitted or published yet. React demos are not yet supported in published lessons pending security validation.
        </p>
      )}
    </section>
  );
}
