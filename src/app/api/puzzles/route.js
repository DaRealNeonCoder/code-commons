import { puzzleStore } from "@/lib/db/stores";
import { readPublishRequest, saveErrorResponse } from "@/lib/publish";

const MAX_TEST_CASES = 50;
const MAX_TEST_FIELD_LENGTH = 10_000;
const MAX_CODE_LENGTH = 20_000;

// Returns a clean array, or null if the payload is malformed.
// Test cases are optional: a missing/empty list means "no Submit button".
function parseTestCases(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_TEST_CASES) return null;

  const cases = [];
  for (const t of value) {
    if (
      typeof t?.input !== "string" ||
      typeof t?.expected !== "string" ||
      !t.expected.trim() ||
      t.input.length > MAX_TEST_FIELD_LENGTH ||
      t.expected.length > MAX_TEST_FIELD_LENGTH
    ) {
      return null;
    }
    cases.push({ input: t.input, expected: t.expected, hidden: Boolean(t.hidden) });
  }
  return cases;
}

// Publishes a puzzle project to the database. Signed-in, owner-checked, and
// re-publishing the same project updates the same puzzle (projectId upsert).
export async function POST(request) {
  const p = await readPublishRequest(request, "puzzle", "puzzle");
  if (p.response) return p.response;

  const testCases = parseTestCases(p.body.testCases);
  if (testCases === null) {
    return Response.json(
      { error: `Each test case needs an expected output (max ${MAX_TEST_CASES} cases).` },
      { status: 400 }
    );
  }

  const starterCode = typeof p.body.starterCode === "string" ? p.body.starterCode : "";
  if (starterCode.length > MAX_CODE_LENGTH) {
    return Response.json({ error: "Starter code is too long." }, { status: 400 });
  }

  const result = await puzzleStore.save({
    ownerId: p.user.id, // from the session, never from the request
    projectId: p.project.id,
    title: p.title,
    summary: p.summary,
    body: p.markdown,
    ...p.selection,
    payload: { starterCode, testCases },
  });
  if (!result.ok) return saveErrorResponse(result);

  return Response.json({ id: result.slug });
}
