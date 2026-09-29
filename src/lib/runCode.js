// lib/runCode.js
//
// Shared Piston runner. Used by /api/execute (the Run button) and
// /api/puzzles/[id]/check (the Submit button).

const PISTON_BASE_URL = process.env.PISTON_BASE_URL || "http://localhost:2000/api/v2";

// App language id -> Piston language name.
// To turn C++ / Rust on, add `cpp: "c++"` and `rust: "rust"` here.
const PISTON_LANGUAGES = {
  python: "python",
};

export class ExecutionServiceError extends Error {}

export function isSupportedLanguage(language) {
  return language in PISTON_LANGUAGES;
}

const versionCache = {};

async function getVersion(pistonLanguage) {
  if (versionCache[pistonLanguage]) return versionCache[pistonLanguage];

  let runtimes;
  try {
    const res = await fetch(`${PISTON_BASE_URL}/runtimes`);
    runtimes = await res.json();
  } catch (err) {
    console.error("Failed to reach Piston runtimes:", err);
    throw new ExecutionServiceError("Could not reach execution service");
  }

  const version = runtimes.find((r) => r.language === pistonLanguage)?.version;
  if (!version) {
    throw new ExecutionServiceError(`No ${pistonLanguage} runtime is installed on the execution service`);
  }
  versionCache[pistonLanguage] = version;
  return version;
}

/**
 * Runs `code` with `stdin` and resolves to { stdout, stderr, exitCode, signal }.
 * Throws ExecutionServiceError if the execution service itself is unavailable.
 * `signal` is set (e.g. "SIGKILL") when Piston killed the process, which is
 * what a timeout looks like.
 */
export async function runCode({ language, code, stdin = "" }) {
  const pistonLanguage = PISTON_LANGUAGES[language];
  if (!pistonLanguage) {
    throw new ExecutionServiceError(`${language} execution isn't configured yet.`);
  }

  const version = await getVersion(pistonLanguage);

  let res;
  try {
    res = await fetch(`${PISTON_BASE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: pistonLanguage,
        version,
        files: [{ content: code }],
        stdin,
        run_timeout: 3000,
      }),
    });
  } catch (err) {
    console.error("Failed to reach Piston:", err);
    throw new ExecutionServiceError("Could not reach execution service");
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("Piston error:", res.status, text);
    throw new ExecutionServiceError(`Execution service error (${res.status})`);
  }

  const data = await res.json();

  // Compiled languages: a failed compile means the program never ran.
  if (data.compile && data.compile.code !== 0) {
    return {
      stdout: data.compile.stdout ?? "",
      stderr: data.compile.stderr ?? "",
      exitCode: data.compile.code ?? 1,
      signal: data.compile.signal ?? null,
    };
  }

  return {
    stdout: data.run?.stdout ?? "",
    stderr: data.run?.stderr ?? "",
    exitCode: data.run?.code ?? null,
    signal: data.run?.signal ?? null,
  };
}