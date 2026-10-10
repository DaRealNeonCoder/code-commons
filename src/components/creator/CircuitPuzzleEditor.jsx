"use client";

const fieldClass = "rounded border border-zinc-300 px-2 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950";

export function newCircuitPuzzleCase(key, inputs = [], outputs = []) {
  return {
    key,
    input: inputs.map(() => false),
    expected: outputs.map(() => false),
  };
}

function labelFor(component) {
  return component?.label || component?.id || "unnamed";
}

function BitPicker({ value, onChange, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`min-w-8 rounded border px-2 py-1 font-mono text-xs font-semibold transition-colors ${
        value
          ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
          : "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
      }`}
    >
      {value ? "1" : "0"}
    </button>
  );
}

function TerminalPicker({ title, kind, components, selected, onChange }) {
  const candidates = components.filter((component) => component.kind === kind);

  function toggle(id) {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    onChange(next);
  }

  return (
    <div>
      <h3 className="font-mono text-xs text-zinc-500">{title}</h3>
      {candidates.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">Add {kind === "INPUT" ? "an input" : "an LED"} in the workspace first.</p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {candidates.map((component) => (
            <label key={component.id} className="flex items-center gap-2 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <input type="checkbox" checked={selected.includes(component.id)} onChange={() => toggle(component.id)} />
              <span className="truncate">{labelFor(component)}</span>
              <span className="ml-auto font-mono text-xs text-zinc-500">{component.id}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CircuitPuzzleEditor({
  enabled,
  onEnabledChange,
  components,
  inputs,
  outputs,
  onInputsChange,
  onOutputsChange,
  testCases,
  onTestCasesChange,
}) {
  function updateCase(key, side, index) {
    onTestCasesChange(
      testCases.map((testCase) => {
        if (testCase.key !== key) return testCase;
        const values = [...testCase[side]];
        values[index] = !values[index];
        return { ...testCase, [side]: values };
      })
    );
  }

  function resizeCases(nextInputs, nextOutputs) {
    onTestCasesChange(
      testCases.map((testCase) => ({
        ...testCase,
        input: nextInputs.map((_, index) => Boolean(testCase.input[index])),
        expected: nextOutputs.map((_, index) => Boolean(testCase.expected[index])),
      }))
    );
  }

  function setInputs(next) {
    onInputsChange(next);
    resizeCases(next, outputs);
  }

  function setOutputs(next) {
    onOutputsChange(next);
    resizeCases(inputs, next);
  }

  function addCase() {
    const key = `circuit-tc-${Date.now().toString(36)}-${testCases.length}`;
    onTestCasesChange([...testCases, newCircuitPuzzleCase(key, inputs, outputs)]);
  }

  return (
    <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm text-zinc-500">circuit puzzle</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Turn this circuit lesson into a checked puzzle. Select every input and LED that belongs to the puzzle, then define its truth table.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
          publish as circuit puzzle
        </label>
      </div>

      {enabled && (
        <>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <TerminalPicker title="Puzzle inputs" kind="INPUT" components={components} selected={inputs} onChange={setInputs} />
            <TerminalPicker title="Puzzle outputs" kind="LED" components={components} selected={outputs} onChange={setOutputs} />
          </div>

          <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-mono text-xs text-zinc-500">hidden truth-table cases</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Every case is stored on the server and hidden from learners. Click each bit to toggle it.
                </p>
              </div>
              <button type="button" onClick={addCase} className={`${fieldClass} text-zinc-600 hover:border-zinc-500 dark:text-zinc-300`}>
                + add case
              </button>
            </div>

            {testCases.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">Add at least one case before publishing.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {testCases.map((testCase, caseIndex) => (
                  <div key={testCase.key} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-zinc-500">case {caseIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => onTestCasesChange(testCases.filter((value) => value.key !== testCase.key))}
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-zinc-500">inputs</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {inputs.map((id, index) => (
                            <BitPicker key={id} value={Boolean(testCase.input[index])} onChange={() => updateCase(testCase.key, "input", index)} label={`Case ${caseIndex + 1} input ${labelFor(components.find((component) => component.id === id))}`} />
                          ))}
                          {inputs.length === 0 && <span className="text-sm text-zinc-500">none</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-500">expected outputs</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {outputs.map((id, index) => (
                            <BitPicker key={id} value={Boolean(testCase.expected[index])} onChange={() => updateCase(testCase.key, "expected", index)} label={`Case ${caseIndex + 1} expected ${labelFor(components.find((component) => component.id === id))}`} />
                          ))}
                          {outputs.length === 0 && <span className="text-sm text-red-500">select at least one output</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
