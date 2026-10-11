// Loaded from a CDN. Check https://pyodide.org for a newer version if you like.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

let pyodidePromise = null;
let trackingDownloads = false;
const downloads = new Map();

function reportProgress(url, loaded, total) {
  downloads.set(url, { loaded, total });

  let loadedTotal = 0;
  let knownTotal = 0;
  for (const download of downloads.values()) {
    loadedTotal += download.loaded;
    knownTotal += download.total;
  }

  postMessage({ type: "progress", loaded: loadedTotal, total: knownTotal });
}

function watchResponse(url, response) {
  if (!trackingDownloads || !response.body || typeof response.body.getReader !== "function") {
    return response;
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  let loaded = 0;

  reportProgress(url, loaded, total);

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          reportProgress(url, loaded, total || loaded);
          return;
        }

        loaded += value?.byteLength || 0;
        reportProgress(url, loaded, total);
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// loadPyodide uses fetch for the wasm, lock file, and standard library assets.
// Re-wrap those response streams so the main thread can show real byte progress
// without changing how Pyodide loads or caching the runtime itself.
const originalFetch = self.fetch.bind(self);
self.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const request = args[0];
  const url = typeof request === "string" ? request : request?.url || "pyodide";
  return watchResponse(url, response);
};

function getPyodide() {
  if (!pyodidePromise) {
    trackingDownloads = true;
    pyodidePromise = loadPyodide()
      .then((pyodide) => {
        trackingDownloads = false;
        postMessage({ type: "ready" });
        return pyodide;
      })
      .catch((err) => {
        trackingDownloads = false;
        pyodidePromise = null; // allow retry (e.g. after going back online)
        postMessage({ type: "load-error", error: err.message || String(err) });
        throw err;
      });
  }
  return pyodidePromise;
}

// Strip Pyodide's internal frames so users only see their own traceback.
function cleanTraceback(msg) {
  const i = msg.indexOf('File "<exec>"');
  return i === -1 ? msg : "Traceback (most recent call last):\n  " + msg.slice(i);
}

// Each run owns the standard streams; queue runs so simultaneous callers (for
// example two workspaces on a page) never swap each other's stdin/stdout.
let runs = Promise.resolve();

async function run({ id, code, stdin, interactive }) {
  let pyodide;
  try {
    pyodide = await getPyodide();
  } catch (err) {
    postMessage({ id, type: "result", stdout: "", stderr: "", error: `Failed to load Python runtime: ${err.message}` });
    return;
  }

  // Tells the main thread the runtime is ready, so the timeout only covers execution.
  postMessage({ id, type: "started" });

  let stdout = "";
  let stderr = "";
  const stdoutDecoder = new TextDecoder();
  const stderrDecoder = new TextDecoder();
  pyodide.setStdout({ write(bytes) {
    const text = stdoutDecoder.decode(bytes, { stream: true });
    stdout += text;
    if (text) postMessage({ id, type: "output", stdout, stderr });
    return bytes.length;
  } });
  pyodide.setStderr({ write(bytes) {
    const text = stderrDecoder.decode(bytes, { stream: true });
    stderr += text;
    if (text) postMessage({ id, type: "output", stdout, stderr });
    return bytes.length;
  } });

  // setStdin callbacks must be synchronous. Only the worker waits; the main
  // thread writes a UTF-8 line into shared memory and wakes it with Atomics.
  // Puzzle test runs use supplied stdin and return EOF when it runs out.
  const input = String(stdin ?? "").replace(/\r\n/g, "\n");
  let position = 0;
  const control = interactive ? new SharedArrayBuffer(8) : null;
  const data = interactive ? new SharedArrayBuffer(65536) : null;
  pyodide.setStdin({ stdin() {
    if (position < input.length) {
      const end = input.indexOf("\n", position);
      const line = end === -1 ? input.slice(position) : input.slice(position, end + 1);
      position = end === -1 ? input.length : end + 1;
      return line;
    }
    if (!interactive) return null;

    const state = new Int32Array(control);
    Atomics.store(state, 0, 0);
    postMessage({ id, type: "input-request", buffer: { control, data } });
    Atomics.wait(state, 0, 0);
    return Atomics.load(state, 0) === 2
      ? null
      : new Uint8Array(data, 0, Atomics.load(state, 1)).slice();
  }, isatty: interactive });

  // Fresh namespace per run so state doesn't leak between runs.
  const globals = pyodide.globals.get("dict")();
  globals.set("__name__", "__main__"); // makes `if __name__ == "__main__":` work

  try {
    await pyodide.loadPackagesFromImports(code); // auto-loads numpy, etc.
    await pyodide.runPythonAsync(code, { globals });
    stdout += stdoutDecoder.decode();
    stderr += stderrDecoder.decode();
    postMessage({ id, type: "result", stdout, stderr });
  } catch (err) {
    stdout += stdoutDecoder.decode();
    stderr += stderrDecoder.decode();
    postMessage({ id, type: "result", stdout, stderr, error: cleanTraceback(String(err.message || err)) });
  } finally {
    globals.destroy();
  }
}

self.onmessage = (e) => {
  if (e.data.type === "init") {
    getPyodide().catch(() => {});
  } else if (e.data.type === "run") {
    runs = runs.then(() => run(e.data)).catch((err) => {
      postMessage({ id: e.data.id, type: "result", stdout: "", stderr: "", error: String(err.message || err) });
    });
  }
};
