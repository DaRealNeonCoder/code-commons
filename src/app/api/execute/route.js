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

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.code || typeof body.code !== "string") {
    return Response.json({ error: "Missing code" }, { status: 400 });
  }
  if (body.code.length > 20_000) {
    return Response.json({ error: "Code too long" }, { status: 400 });
  }

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
      files: [{ content: body.code }],
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