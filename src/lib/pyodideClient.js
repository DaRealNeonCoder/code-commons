let worker = null;
let nextId = 0;
const pending = new Map(); // id -> { resolve, reject, timer, timeoutMs, onOutput, onInput }
const statusListeners = new Set();

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
  if (pyodideStatus.state === "loading") return;
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
  const encoded = line === null ? null : new TextEncoder().encode(`${line}\n`);
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

/** Resolves to { stdout, stderr, error? }. Rejects on timeout/crash. */
export function runPythonInBrowser(code, { timeoutMs = 10000, stdin = "", interactive = false, onOutput, onInput } = {}) {
  markPyodideLoading();
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, timer: null, timeoutMs, onOutput, onInput, inputBuffer: null });
    getWorker().postMessage({ id, type: "run", code, stdin, interactive });
  });
}
