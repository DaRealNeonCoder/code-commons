"use client";

let nextKey = 0;

export function newTestCase(overrides = {}) {
  nextKey += 1;
  return { key: `tc-${nextKey}`, input: "", expected: "", hidden: false, ...overrides };
}

const fieldClass =
  "mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950";

export default function TestCaseEditor({ testCases, onChange }) {
  function update(key, patch) {
    onChange(testCases.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function remove(key) {
    onChange(testCases.filter((t) => t.key !== key));
  }

  return (
    <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-1 font-mono text-sm text-zinc-500">test cases</h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Each case sends <em>input</em> to the program&apos;s stdin and compares stdout to <em>expected</em>{" "}
        (trailing whitespace is ignored). Hidden cases are checked on the server and never sent to the
        learner&apos;s browser.
      </p>

      {testCases.length === 0 && (
        <p className="mb-4 text-sm text-zinc-500">
          No test cases yet. Without any, the puzzle has no Submit button.
        </p>
      )}

      <div className="space-y-4">
        {testCases.map((t, i) => (
          <div key={t.key} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-500">case {i + 1}</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={t.hidden}
                    onChange={(e) => update(t.key, { hidden: e.target.checked })}
                  />
                  hidden
                </label>
                <button
                  type="button"
                  onClick={() => remove(t.key)}
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  remove
                </button>
              </div>
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium" htmlFor={`${t.key}-input`}>
                  Input (stdin)
                </label>
                <textarea
                  id={`${t.key}-input`}
                  value={t.input}
                  onChange={(e) => update(t.key, { input: e.target.value })}
                  rows={2}
                  spellCheck={false}
                  placeholder="10"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium" htmlFor={`${t.key}-expected`}>
                  Expected output
                </label>
                <textarea
                  id={`${t.key}-expected`}
                  value={t.expected}
                  onChange={(e) => update(t.key, { expected: e.target.value })}
                  rows={2}
                  spellCheck={false}
                  placeholder="55"
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...testCases, newTestCase()])}
        className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-sm text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
      >
        + add test case
      </button>
    </section>
  );
}