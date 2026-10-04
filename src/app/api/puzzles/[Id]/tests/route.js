import { getPuzzleById } from "@/lib/puzzles";
import { outputsMatch } from "@/lib/compareOutput";

const MAX_OUTPUT = 10_000;
const FAILURES = {
  timeout: "Time or memory limit exceeded",
  crash: "Program crashed",
};

async function loadCheckablePuzzle(params) {
  const resolvedParams = await params;
  const id = Object.values(resolvedParams ?? {})[0];

  if (typeof id !== "string" || !/^[\w-]+$/.test(id)) {
    return { errorResponse: Response.json({ error: "Invalid puzzle id." }, { status: 400 }) };
  }
  const puzzle = await getPuzzleById(id);
  if (!puzzle || !puzzle.available || puzzle.testCases.length === 0) {
    return { errorResponse: Response.json({ error: "This puzzle has no tests to check." }, { status: 404 }) };
  }
  return { puzzle };
}

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request, { params }) {
  try {
    const { puzzle, errorResponse } = await loadCheckablePuzzle(params);
    if (errorResponse) return errorResponse;

    const tests = puzzle.testCases.map((t) =>
      t.hidden ? { input: t.input, hidden: true } : { input: t.input, expected: t.expected, hidden: false }
    );
    return Response.json({ tests }, { headers: NO_STORE });
  } catch (err) {
    console.error("Loading puzzle tests failed:", err);
    return Response.json({ error: "Could not load the tests. See the server logs." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { puzzle, errorResponse } = await loadCheckablePuzzle(params);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    const outputs = body?.outputs;

    const wellFormed =
      Array.isArray(outputs) &&
      outputs.length === puzzle.testCases.length &&
      outputs.every(
        (o) =>
          o &&
          typeof o.stdout === "string" &&
          (o.failure === undefined || o.failure === null || o.failure in FAILURES)
      );
    if (!wellFormed) {
      return Response.json({ error: "Send one { stdout, failure? } per test case." }, { status: 400 });
    }

    const results = puzzle.testCases.map((test, i) => {
      const output = outputs[i];
      const result = { hidden: test.hidden };

      if (output.failure) {
        result.status = "error";
        result.message = FAILURES[output.failure];
      } else if (outputsMatch(output.stdout.slice(0, MAX_OUTPUT), test.expected)) {
        result.status = "pass";
      } else {
        result.status = "fail";
        result.message = "Wrong answer";
      }
      return result;
    });

    const passed = results.filter((r) => r.status === "pass").length;
    return Response.json({ passed, total: results.length, results }, { headers: NO_STORE });
  } catch (err) {
    console.error("Judging puzzle outputs failed:", err);
    return Response.json({ error: "Could not judge the results. See the server logs." }, { status: 500 });
  }
}