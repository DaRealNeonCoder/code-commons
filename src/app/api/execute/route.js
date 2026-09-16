// app/api/execute/route.js

const PISTON_BASE_URL = process.env.PISTON_BASE_URL || "http://localhost:2000/api/v2";

let cachedPythonVersion = null;

async function getPythonVersion() {
  if (cachedPythonVersion) return cachedPythonVersion;
  const res = await fetch(`${PISTON_BASE_URL}/runtimes`);
  const runtimes = await res.json();
  cachedPythonVersion = runtimes.find((r) => r.language === "python")?.version;
  return cachedPythonVersion;
}

// The original, working implementation — unchanged behavior, just moved
// into its own function so it can sit next to the other languages below.
async function runPython(code) {
  let version;
  try {
    version = await getPythonVersion();
  } catch (err) {
    console.error("Failed to reach Piston runtimes:", err);
    return Response.json({ error: "Could not reach execution service" }, { status: 502 });
  }

  const res = await fetch(`${PISTON_BASE_URL}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "python",
      version,
      files: [{ content: code }],
      run_timeout: 3000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Piston error:", res.status, text); // <-- check your terminal for this
    return Response.json({ error: `Execution service error (${res.status})` }, { status: 502 });
  }

  const data = await res.json();
  return Response.json({
    stdout: data.run?.stdout ?? "",
    stderr: data.run?.stderr ?? "",
    exitCode: data.run?.code ?? null,
  });
}

// STUB — not wired up yet, on purpose. Piston (the same service already
// running for Python) also supports "cpp" as a language, so the fastest
// path is probably to copy runPython() above, swap the `language`/version
// lookup for "cpp", and you're done. Left as a stub until you're ready.
async function runCpp(_code) {
  return Response.json({
    stdout: "",
    stderr: "",
    error: "C++ execution isn't configured yet.",
  });
}

// STUB — same idea as runCpp(). Piston supports "rust" as a language too.
async function runRust(_code) {
  return Response.json({
    stdout: "",
    stderr: "",
    error: "Rust execution isn't configured yet.",
  });
}

const RUNNERS = {
  python: runPython,
  cpp: runCpp,
  rust: runRust,
};

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.code || typeof body.code !== "string") {
    return Response.json({ error: "Missing code" }, { status: 400 });
  }
  if (body.code.length > 20_000) {
    return Response.json({ error: "Code too long" }, { status: 400 });
  }

  const language = body.language || "python";
  const runner = RUNNERS[language];
  if (!runner) {
    return Response.json({ error: `Unsupported language: ${language}` }, { status: 400 });
  }

  return runner(body.code);
}