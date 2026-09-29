let worker = null;
let nextId = 0;
const pending = new Map(); // id -> { resolve, reject, timer, timeoutMs }

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

  worker.onerror = (e) => resetWorker(e.message || "Python worker crashed");

  return worker;
}

/** Start downloading the runtime early (call when the user enables browser mode). */
export function preloadPyodide() {
  getWorker().postMessage({ type: "init" });
}

/** Resolves to { stdout, stderr, error? }. Rejects on timeout/crash. */
export function runPythonInBrowser(code, { timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, timer: null, timeoutMs });
    getWorker().postMessage({ id, type: "run", code });
  });
}