let worker = null;
let nextId = 0;
const pending = new Map(); // id -> { resolve, reject, timer, timeoutMs, onOutput, onInput }
const statusListeners = new Set();
const INTERACTIVE_INPUT_ERROR =
  "Interactive Python input needs a cross-origin isolated page. Reload this page from the normal app URL and try again.";

let pyodideStatus = {
  state: "idle", // idle | loading | ready | error
  loaded: 0,
  total: 0,
  error: null,
};

function setPyodideStatus(next) {
  pyodideStatus = { ...pyodideStatus, ...next };
  for (const listener of statusListeners) listener();
}

export function subscribePyodideStatus(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function getPyodideStatus() {
  return pyodideStatus;
}

function markPyodideLoading() {
  // Running code after the runtime has loaded must not reset the status back to
  // an indeterminate download. The worker keeps the same Pyodide instance for
  // subsequent runs and will not send another `ready` message in that case.
  if (pyodideStatus.state === "loading" || pyodideStatus.state === "ready") return;
  setPyodideStatus({ state: "loading", loaded: 0, total: 0, error: null });
}

function resetWorker(reason) {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(new Error(reason));
  }
  pending.clear();
  setPyodideStatus({ state: "idle", loaded: 0, total: 0, error: null });
}

function startTimer(p) {
  clearTimeout(p.timer);
  p.timer = setTimeout(() => {
    resetWorker(`Time limit exceeded (${p.timeoutMs / 1000}s). Is there an infinite loop?`);
  }, p.timeoutMs);
}

// The worker uses SharedArrayBuffer so its synchronous Pyodide stdin callback
// can wait without freezing the editor. The headers for this app enable the
// feature in supported browsers; this check turns a cryptic worker failure
// into an actionable message when a deployment or browser blocks it.
export function supportsInteractiveInput() {
  return (
    typeof globalThis !== "undefined" &&
    globalThis.crossOriginIsolated === true &&
    typeof globalThis.SharedArrayBuffer === "function" &&
    typeof globalThis.Atomics?.wait === "function"
  );
}

function getWorker() {
  if (worker) return worker;

  worker = new Worker("/pyodide-worker.js");

  worker.onmessage = (e) => {
    const { id, type, ...rest } = e.data;

    if (type === "progress") {
      setPyodideStatus({ state: "loading", loaded: rest.loaded, total: rest.total, error: null });
      return;
    }

    if (type === "ready") {
      setPyodideStatus({ state: "ready", loaded: rest.loaded ?? 0, total: rest.total ?? 0, error: null });
      return;
    }

    if (type === "load-error") {
      setPyodideStatus({ state: "error", error: rest.error || "Failed to load Python runtime." });
      return;
    }

    const p = pending.get(id);
    if (!p) return;

    if (type === "started") {
      startTimer(p);
    } else if (type === "output") {
      p.onOutput?.(rest.stdout, rest.stderr);
    } else if (type === "input-request") {
      clearTimeout(p.timer); // time spent typing isn't execution time
      p.inputBuffer = rest.buffer;
      p.onInput?.(id);
    } else if (type === "result") {
      clearTimeout(p.timer);
      pending.delete(id);
      p.resolve(rest);
    }
  };

  worker.onerror = (e) => {
    resetWorker(e.message || "Python worker crashed");
    setPyodideStatus({ state: "error", error: e.message || "Python worker crashed" });
  };

  return worker;
}

/** Start downloading the runtime early (call when the user enables browser mode). */
export function preloadPyodide() {
  markPyodideLoading();
  getWorker().postMessage({ type: "init" });
}

/** Submit a line (or EOF with null) to the run currently waiting on input(). */
export function sendPythonInput(id, line) {
  const p = pending.get(id);
  if (!p?.inputBuffer) return false;

  const { control, data } = p.inputBuffer;
  const state = new Int32Array(control);
  const bytes = new Uint8Array(data);
  const encoded = line === null ? null : new TextEncoder().encode(`${String(line)}\n`);
  if (encoded && encoded.length > bytes.length) {
    throw new Error(`Input line is too long (maximum ${bytes.length} UTF-8 bytes).`);
  }
  if (encoded) bytes.set(encoded);
  Atomics.store(state, 1, encoded?.length ?? 0);
  Atomics.store(state, 0, encoded ? 1 : 2);
  p.inputBuffer = null;
  startTimer(p);
  Atomics.notify(state, 0);
  return true;
}

/** Signal EOF to the run currently waiting on input(). */
export function sendPythonEOF(id) {
  return sendPythonInput(id, null);
}

/** Resolves to { stdout, stderr, error? }. Rejects on timeout/crash. */
export function runPythonInBrowser(code, { timeoutMs = 10000, stdin = "", interactive = false, onOutput, onInput } = {}) {
  if (interactive && !supportsInteractiveInput()) {
    return Promise.reject(new Error(INTERACTIVE_INPUT_ERROR));
  }

  markPyodideLoading();
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, timer: null, timeoutMs, onOutput, onInput, inputBuffer: null });
    getWorker().postMessage({ id, type: "run", code, stdin, interactive });
  });
}
