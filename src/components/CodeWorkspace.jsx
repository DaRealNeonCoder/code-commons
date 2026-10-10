"use client";
import { useRef, useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import CodeEditor from "@/components/CodeEditor";
import CompletionToggle from "@/components/CompletionToggle";
import AITutor from "@/components/AITutor";
import { useSession } from "@/lib/auth-client";
import {
  getPyodideStatus,
  preloadPyodide,
  runPythonInBrowser,
  subscribePyodideStatus,
} from "@/lib/pyodideClient";
import { outputsMatch, withTrailingNewline, clip } from "@/lib/compareOutput";

const ACCENTS = {
  amber: { dot: "bg-amber-400", link: "text-amber-600 dark:text-amber-400 hover:underline" },
  teal: { dot: "bg-teal-400", link: "text-teal-600 dark:text-teal-400 hover:underline" },
  emerald: { dot: "bg-emerald-400", link: "text-emerald-600 dark:text-emerald-400 hover:underline" },
};

const LANGUAGES = [
  { id: "python", label: "Python", ext: "py" },
  { id: "cpp", label: "C++", ext: "cpp" },
  { id: "rust", label: "Rust", ext: "rs" },
];

const LAYOUTS = [
  { id: "description", label: "Description" },
  { id: "split", label: "Split" },
  { id: "editor", label: "Editor" },
];

const EMPTY_STARTER = {
  python: "# no starter code yet\n",
  cpp: "// no starter code yet\n",
  rust: "// no starter code yet\n",
};

function languageInfo(id) {
  return LANGUAGES.find((lang) => lang.id === id) || LANGUAGES[0];
}

// The Pyodide worker has no stdin channel, so point sys.stdin at the input from
// inside Python. This shifts traceback line numbers by 1.
function withStdin(code, stdinText) {
  return `import sys, io; sys.stdin = io.StringIO(${JSON.stringify(withTrailingNewline(stdinText))})\n${code}`;
}

// Parse a response body as JSON, or null if it isn't (e.g. an HTML error page).
async function readJson(res) {
  try {
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}

function TestResults({ data }) {
  const { passed, total, results } = data;
  const allPassed = passed === total;

  return (
    <div>
      <p className={allPassed ? "text-green-400" : "text-amber-400"}>
        {allPassed ? `All ${total} tests passed!` : `${passed}/${total} tests passed`}
      </p>
      {results.map((r, i) => (
        <div key={i} className="mt-2">
          <p className={r.status === "pass" ? "text-green-400" : "text-red-400"}>
            {r.status === "pass" ? "✓" : "✗"} {r.hidden ? "Hidden test" : "Test"} {i + 1}
            {r.message ? ` - ${r.message}` : ""}
          </p>
          {r.status !== "pass" && !r.hidden && (
            <pre className="ml-4 whitespace-pre-wrap text-xs text-zinc-400">
              {`input:    ${r.input.trimEnd()}\nexpected: ${r.expected.trimEnd()}\ngot:      ${r.actual.trimEnd()}`}
              {r.stderr ? `\nstderr:   ${r.stderr.trimEnd()}` : ""}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function PyodideDownloadStatus({ status }) {
  if (status.state !== "loading") return null;

  const progress = status.total > 0
    ? Math.min(100, Math.round((status.loaded / status.total) * 100))
    : null;

  return (
    <div
      role="status"
      title="The Python compiler is downloading in the background. You can run code when it is ready."
      className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900/70 px-2 py-1"
    >
      <span className="sr-only">
        The Python compiler is downloading in the background. You can run code when it is ready.
      </span>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-zinc-700" aria-hidden="true">
        <span
          className={`block h-full rounded-full bg-teal-400 transition-[width] duration-300 ${
            progress === null ? "animate-pulse" : ""
          }`}
          style={{ width: `${progress ?? 45}%` }}
        />
      </span>
      <span className="font-mono text-[10px] text-zinc-500">
        {progress === null ? "compiler" : `${progress}%`}
      </span>
    </div>
  );
}

export default function CodeWorkspace({
  fileBaseName = "main",
  starterCode = {},
  description,
  backHref,
  backLabel,
  accent = "amber",
  lockedLanguage,
  itemType,
  itemId,
  aiContext,
  // Puzzle checking. Only set for puzzles that have test cases.
  checkPuzzleId,
  sampleTests = [],
  hiddenTestCount = 0,
  // Opt-in layout switcher (description / split / editor). Off by default so
  // lessons and puzzles look exactly as before.
  layoutToggle = false,
  defaultLayout = "split",
}) {
  // Accept either a plain string (Python only) or { python, cpp, rust }.
  const starters = typeof starterCode === "string" ? { python: starterCode } : starterCode || {};

  const initialLanguage =
    lockedLanguage ||
    Object.keys(starters).find((id) => LANGUAGES.some((l) => l.id === id)) ||
    "python";

  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(starters[initialLanguage] || EMPTY_STARTER[initialLanguage]);
  const [output, setOutput] = useState("Output will appear here...");
  const [isRunning, setIsRunning] = useState(false);
  const [runInBrowser, setRunInBrowser] = useState(true);
  const [stdin, setStdin] = useState(sampleTests[0]?.input ?? "");
  const [results, setResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [layout, setLayout] = useState(defaultLayout);
  const runtimeWarm = useRef(false);
  const pyodideStatus = useSyncExternalStore(
    subscribePyodideStatus,
    getPyodideStatus,
    getPyodideStatus
  );

  const colors = ACCENTS[accent] || ACCENTS.amber;
  const showLanguagePicker = !lockedLanguage;
  const current = languageInfo(language);
  const busy = isRunning || isChecking;
  const totalTests = sampleTests.length + hiddenTestCount;

  // Without layoutToggle this is always "split", which is the original behavior.
  const activeLayout = layoutToggle ? layout : "split";
  const showDescription = activeLayout !== "editor";
  const showEditor = activeLayout !== "description";
  const descriptionWidth = activeLayout === "description" ? "w-full" : "w-1/2";
  const editorWidth = activeLayout === "editor" ? "w-full" : "w-1/2";

  // Browser execution only exists for Python; everything else goes to the server.
  const canRunInBrowser = language === "python";
  useEffect(() => {
    if (runInBrowser && canRunInBrowser) preloadPyodide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const useBrowser = runInBrowser && canRunInBrowser;

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    setCode(starters[nextLanguage] || EMPTY_STARTER[nextLanguage]);
    setOutput("Output will appear here...");
    setResults(null);
  }

  function handleToggleBrowserMode() {
    const next = !runInBrowser;
    setRunInBrowser(next);
    if (next) preloadPyodide(); // start the ~10 MB download while the user is still typing
  }

  // Passing every test marks the item complete, using the same endpoint as the
  // manual "Mark as complete" button, so the profile page picks it up.
  async function markSolved() {
    if (!userId || !itemType || !itemId) return;

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, completed: true }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Tell CompletionToggle so its button flips without a reload.
      window.dispatchEvent(
        new CustomEvent("progress-changed", {
          detail: { itemType, itemId, completed: true },
        })
      );
    } catch (err) {
      console.error("Could not record solve:", err);
    }
  }

  function showResults(data) {
    setResults(data);
    if (data.total > 0 && data.passed === data.total) markSolved();
  }

  async function runOnServer() {
    const res = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        language,
        stdin: checkPuzzleId ? stdin : undefined,
      }),
    });

    const data = await res.json();
    setOutput(
      data.error
        ? `Error: ${data.error}`
        : data.stdout || data.stderr || "(no output)"
    );
  }

  async function runInPyodide() {
    if (!runtimeWarm.current) {
      setOutput("Loading Python runtime (first run only)...");
    }

    const source = checkPuzzleId ? withStdin(code, stdin) : code;
    const result = await runPythonInBrowser(source);

    runtimeWarm.current = true;

    const text = [result.stdout, result.stderr, result.error]
      .filter(Boolean)
      .join("\n")
      .trimEnd();

    setOutput(text || "(no output)");
  }

  const handleRun = async () => {
    setIsRunning(true);
    setResults(null);
    setOutput("Running...");

    try {
      if (useBrowser) {
        await runInPyodide();
      } else {
        await runOnServer();
      }
    } catch (err) {
      setOutput(
        useBrowser
          ? `Error: ${err.message}`
          : `Network error: ${err.message}`
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Server mode: hidden tests stay on the server; only pass/fail comes back.
  async function checkOnServer() {
    const res = await fetch(
      `/api/puzzles/${encodeURIComponent(checkPuzzleId)}/check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      }
    );

    // Read as text first so an HTML error page (404, redirect, crash) gives a
    // useful message instead of "Unexpected token '<'".
    const raw = await res.text();
    let data = null;

    try {
      data = JSON.parse(raw);
    } catch {
      // not JSON, handled below
    }

    if (!data) {
      setOutput(
        `Error: the check route returned a non-JSON response (HTTP ${res.status}) from ${res.url}.\n` +
          (res.status === 404
            ? "Route not found. It should be at app/api/puzzles/[id]/check/route.js."
            : "Check the dev server terminal for the underlying error.")
      );
      return;
    }

    if (!res.ok || data.error) {
      setOutput(`Error: ${data.error || "Could not check your solution."}`);
      return;
    }

    showResults(data);
  }

  // Browser mode: the code runs in Pyodide like the Run button, but the answer
  // key stays on the server. The browser downloads only the test inputs (plus
  // expected output for visible cases, which are already on the page), runs
  // them, and posts its raw outputs back to be judged.
  async function checkInBrowser() {
    const testsUrl = `/api/puzzles/${encodeURIComponent(checkPuzzleId)}/tests`;

    const testsRes = await fetch(testsUrl);
    const testsPayload = await readJson(testsRes);

    if (!testsRes.ok || !Array.isArray(testsPayload?.tests)) {
      setOutput(
        `Error: ${
          testsPayload?.error ||
          `could not load the tests (HTTP ${testsRes.status}).`
        }`
      );
      return;
    }

    const tests = testsPayload.tests;

    const runs = [];

    for (let i = 0; i < tests.length; i++) {
      setOutput(
        `Running test ${i + 1}/${tests.length}...` +
          (runtimeWarm.current
            ? ""
            : "\n(Loading Python runtime, first run only)")
      );

      let stdout = "";
      let stderr = "";
      let failure;

      try {
        const run = await runPythonInBrowser(
          withStdin(code, tests[i].input),
          { timeoutMs: 5000 }
        );

        runtimeWarm.current = true;
        stdout = run.stdout ?? "";
        stderr = [run.stderr, run.error].filter(Boolean).join("\n");

        if (run.error) failure = "crash";
      } catch (err) {
        // pyodideClient rejects on timeout or worker crash, and resets the worker.
        failure = "timeout";
        stderr = err.message;
      }

      runs.push({ stdout, stderr, failure });
    }

    setOutput("Checking results...");

    const judgeRes = await fetch(testsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputs: runs.map(({ stdout, failure }) => ({
          stdout,
          failure,
        })),
      }),
    });

    const judged = await readJson(judgeRes);

    if (!judgeRes.ok || !Array.isArray(judged?.results)) {
      setOutput(
        `Error: ${
          judged?.error ||
          `could not check your results (HTTP ${judgeRes.status}).`
        }`
      );
      return;
    }

    // Visible failures get input/expected/actual from data the page already had.
    const results = judged.results.map((r, i) => {
      if (r.hidden || r.status === "pass") return r;

      return {
        ...r,
        input: tests[i].input,
        expected: tests[i].expected ?? "",
        actual: clip(runs[i].stdout),
        stderr: clip(runs[i].stderr),
      };
    });

    showResults({
      passed: judged.passed,
      total: judged.total,
      results,
    });
  }

  const handleSubmit = async () => {
    setIsChecking(true);
    setResults(null);
    setOutput("Checking...");

    try {
      if (useBrowser) {
        await checkInBrowser();
      } else {
        await checkOnServer();
      }
    } catch (err) {
      setOutput(
        useBrowser
          ? `Error: ${err.message}`
          : `Network error: ${err.message}`
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {/* Layout switcher (only when layoutToggle is on) */}
      {layoutToggle && (
        <div className="flex items-center justify-end gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-1.5">
          <span className="font-mono text-xs text-zinc-500">layout</span>

          <div
            role="group"
            aria-label="Layout"
            className="flex overflow-hidden rounded border border-zinc-700"
          >
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLayout(l.id)}
                aria-pressed={layout === l.id}
                className={`px-2.5 py-1 font-mono text-xs transition-colors ${
                  layout === l.id
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 w-full">
        {/* Left: lesson / puzzle prompt */}
        <div
          className={`${
            showDescription ? descriptionWidth : "hidden"
          } overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-900`}
        >
          <div
            className={
              activeLayout === "description" ? "mx-auto max-w-3xl" : ""
            }
          >
            {backHref && (
              <Link
                href={backHref}
                className={`mb-6 inline-block font-mono text-sm ${colors.link}`}
              >
                ← {backLabel}
              </Link>
            )}

            {description}

            {itemType && itemId && (
              <CompletionToggle
                itemType={itemType}
                itemId={itemId}
                accent={accent}
              />
            )}
          </div>
        </div>

        {/* Right: toolbar + editor + output. All state lives in this component,
            so unmounting it in "description" mode loses nothing but undo history. */}
        {showEditor && (
          <div className={`${editorWidth} flex flex-col min-h-0`}>
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2">
              <span className="flex items-center gap-2 font-mono text-sm text-zinc-100">
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                {fileBaseName}.{current.ext}
              </span>

              <div className="flex items-center gap-2">
                {showLanguagePicker && (
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                )}

                {useBrowser && <PyodideDownloadStatus status={pyodideStatus} />}

                <button
                  type="button"
                  onClick={handleToggleBrowserMode}
                  disabled={!canRunInBrowser || busy}
                  aria-pressed={useBrowser}
                  title={
                    canRunInBrowser
                      ? "Run Python in your browser (Pyodide) instead of on the server"
                      : "Browser execution is only available for Python"
                  }
                  className={`rounded border px-2 py-1 font-mono text-xs transition-colors disabled:opacity-40 ${
                    useBrowser
                      ? "border-green-500 bg-green-500/15 text-green-400"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  ⚡ Browser
                </button>

                <button
                  onClick={handleRun}
                  disabled={busy}
                  className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isRunning ? "Running..." : "Run ▶"}
                </button>

                {checkPuzzleId && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={busy}
                    title={`Check your solution against all ${totalTests} tests ${
                      useBrowser ? "in your browser" : "on the server"
                    }`}
                    className="rounded bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {isChecking ? "Checking..." : "Submit ✓"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <CodeEditor
                code={code}
                onChange={setCode}
                language={current.id}
              />
            </div>

            {checkPuzzleId && (
              <details className="border-t border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-400">
                <summary className="cursor-pointer select-none font-mono">
                  input for Run (stdin) - Submit checks {totalTests} tests
                  {hiddenTestCount > 0
                    ? `, ${hiddenTestCount} hidden`
                    : ""}
                </summary>

                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  rows={3}
                  spellCheck={false}
                  className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs text-zinc-100"
                />

                {sampleTests.length > 1 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {sampleTests.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStdin(t.input)}
                        className="rounded border border-zinc-700 px-2 py-0.5 font-mono hover:text-zinc-100"
                      >
                        load sample {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </details>
            )}

            <div
              className={`${
                checkPuzzleId ? "h-48" : "h-32"
              } overflow-y-auto whitespace-pre-wrap border-t border-zinc-800 bg-black p-4 font-mono text-sm text-green-400`}
            >
              {results ? <TestResults data={results} /> : output}
            </div>
          </div>
        )}

        {aiContext && (
          <AITutor
            lessonContent={aiContext}
            code={code}
            language={current.id}
          />
        )}
      </div>
    </div>
  );
}
