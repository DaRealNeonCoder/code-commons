let worker = null;
let nextId = 0;
const pending = new Map(); // id -> { resolve, reject, timer, timeoutMs }
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
      p.timer = setTimeout(() => {
        resetWorker(`Time limit exceeded (${p.timeoutMs / 1000}s). Is there an infinite loop?`);
      }, p.timeoutMs);
    } else if (type === "result") {
      clearTimeout(p.timer);
      pending.delete(id);
      p.resolve(rest);
    }
  };

  worker.onerror = (e) => {
    setPyodideStatus({ state: "error", error: e.message || "Python worker crashed" });
    resetWorker(e.message || "Python worker crashed");
  };

  return worker;
}

/** Start downloading the runtime early (call when the user enables browser mode). */
export function preloadPyodide() {
  markPyodideLoading();
  getWorker().postMessage({ type: "init" });
}

/** Resolves to { stdout, stderr, error? }. Rejects on timeout/crash. */
export function runPythonInBrowser(code, { timeoutMs = 10000 } = {}) {
  markPyodideLoading();
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, timer: null, timeoutMs });
    getWorker().postMessage({ id, type: "run", code });
  });
}
