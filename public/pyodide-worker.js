// Loaded from a CDN. Check https://pyodide.org for a newer version if you like.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

let pyodidePromise = null;

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide().catch((err) => {
      pyodidePromise = null; // allow retry (e.g. after going back online)
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

self.onmessage = async (e) => {
  const { id, type, code } = e.data;

  if (type === "init") {
    getPyodide().catch(() => {});
    return;
  }

  if (type !== "run") return;

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
  pyodide.setStdout({ batched: (s) => (stdout += s + "\n") });
  pyodide.setStderr({ batched: (s) => (stderr += s + "\n") });

  // Fresh namespace per run so state doesn't leak between runs.
  const globals = pyodide.globals.get("dict")();
  globals.set("__name__", "__main__"); // makes `if __name__ == "__main__":` work

  try {
    await pyodide.loadPackagesFromImports(code); // auto-loads numpy, etc.
    await pyodide.runPythonAsync(code, { globals });
    postMessage({ id, type: "result", stdout, stderr });
  } catch (err) {
    postMessage({ id, type: "result", stdout, stderr, error: cleanTraceback(String(err.message || err)) });
  } finally {
    globals.destroy();
  }
};