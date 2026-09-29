import { runCode, isSupportedLanguage, ExecutionServiceError } from "@/lib/runCode";

const KNOWN_LANGUAGES = { python: "Python", cpp: "C++", rust: "Rust" };

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.code || typeof body.code !== "string") {
    return Response.json({ error: "Missing code" }, { status: 400 });
  }
  if (body.code.length > 20_000) {
    return Response.json({ error: "Code too long" }, { status: 400 });
  }

  const stdin = typeof body.stdin === "string" ? body.stdin : "";
  if (stdin.length > 10_000) {
    return Response.json({ error: "Input too long" }, { status: 400 });
  }

  const language = body.language || "python";
  if (!KNOWN_LANGUAGES[language]) {
    return Response.json({ error: `Unsupported language: ${language}` }, { status: 400 });
  }

  // C++ and Rust are still stubs on purpose. Enable them in lib/runCode.js.
  if (!isSupportedLanguage(language)) {
    return Response.json({
      stdout: "",
      stderr: "",
      error: `${KNOWN_LANGUAGES[language]} execution isn't configured yet.`,
    });
  }

  try {
    const result = await runCode({ language, code: body.code, stdin });
    return Response.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (err) {
    if (err instanceof ExecutionServiceError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}