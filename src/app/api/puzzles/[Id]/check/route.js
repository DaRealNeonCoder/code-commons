import { getPuzzleById } from "@/lib/puzzles";
import { runCode, isSupportedLanguage, ExecutionServiceError } from "@/lib/runCode";
import { outputsMatch, withTrailingNewline, clip } from "@/lib/compareOutput";


async function handleCheck(request, { params }) {
  // Works whatever the dynamic folder is called ([id], [puzzleId], [slug]...).
  const resolvedParams = await params;
  const id = Object.values(resolvedParams ?? {})[0];

  // Ids become file names, so refuse anything that isn't a plain slug.
  if (typeof id !== "string" || !/^[\w-]+$/.test(id)) {
    return Response.json({ error: "Invalid puzzle id." }, { status: 400 });
  }

  const puzzle = await getPuzzleById(id);
  if (!puzzle) {
    console.warn(`[puzzle check] no file found for id "${id}" in ${process.cwd()}/content/puzzles`);
    return Response.json({ error: `Puzzle "${id}" was not found.` }, { status: 404 });
  }
  if (!puzzle.available) {
    return Response.json({ error: "This puzzle isn't available yet." }, { status: 404 });
  }
  if (puzzle.testCases.length === 0) {
    console.warn(
      `[puzzle check] "${id}" loaded with 0 test cases. Frontmatter keys: ${Object.keys(puzzle).join(", ")}`
    );
    return Response.json(
      { error: `Puzzle "${id}" has no test cases in its frontmatter (see server log).` },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.code || typeof body.code !== "string") {
    return Response.json({ error: "Missing code" }, { status: 400 });
  }
  if (body.code.length > 20_000) {
    return Response.json({ error: "Code too long" }, { status: 400 });
  }

  const language = body.language || "python";
  if (!isSupportedLanguage(language)) {
    return Response.json({ error: `${language} execution isn't configured yet.` }, { status: 400 });
  }

  const results = [];

  for (const test of puzzle.testCases) {
    let run;
    try {
      run = await runCode({ language, code: body.code, stdin: withTrailingNewline(test.input) });
    } catch (err) {
      if (err instanceof ExecutionServiceError) {
        return Response.json({ error: err.message }, { status: 502 });
      }
      throw err;
    }

    let status;
    let message;
    if (run.signal) {
      status = "error";
      message = "Time or memory limit exceeded";
    } else if (run.exitCode !== 0) {
      status = "error";
      message = "Program crashed";
    } else if (outputsMatch(run.stdout, test.expected)) {
      status = "pass";
    } else {
      status = "fail";
      message = "Wrong answer";
    }

    const result = { hidden: test.hidden, status };
    if (message) result.message = message;

    // Only visible cases get details. Hidden ones report pass/fail and nothing
    // else, so neither the input, the expected output, nor a traceback that
    // echoes them ever leaves the server.
    if (!test.hidden && status !== "pass") {
      result.input = test.input;
      result.expected = test.expected;
      result.actual = clip(run.stdout);
      result.stderr = clip(run.stderr);
    }

    results.push(result);
  }

  const passed = results.filter((r) => r.status === "pass").length;
  return Response.json({ passed, total: results.length, results });
}

// Anything unexpected becomes a JSON error (and a server log) instead of
// Next's HTML error page, which the browser can't parse.
export async function POST(request, context) {
  try {
    return await handleCheck(request, context);
  } catch (err) {
    console.error("Puzzle check failed:", err);
    return Response.json({ error: "The check failed on the server. See the server logs." }, { status: 500 });
  }
}