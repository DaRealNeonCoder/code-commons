import { cache } from "react";
import { puzzleStore } from "./db/stores";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

// jsonb comes back as whatever was stored, so coerce to the strict shape.
function normalizeTestCases(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((t) => t && t.expected !== undefined && t.expected !== null)
    .map((t) => ({
      input: String(t.input ?? ""),
      expected: String(t.expected),
      hidden: Boolean(t.hidden),
    }));
}

// The list view never needs test data (the store doesn't even select it), so a
// listing page can't accidentally pass hidden answers to a client component.
export async function getAllPuzzles() {
  const rows = await puzzleStore.list({ onlyAvailable: false });
  return rows.map(({ testCount, ...puzzle }) => ({ ...puzzle, hasTests: testCount > 0 }));
}

// Full puzzle including ALL test cases. Server-only: use it in the check
// route, and use getClientTestInfo() before handing anything to the browser.
// Cached per request, so the page and its metadata cost one lookup.
export const getPuzzleById = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;
  const row = await puzzleStore.getBySlug(id);
  if (!row) return null;
  return { ...row, testCases: normalizeTestCases(row.testCases) };
});

// Display-only puzzles for many ids in one query -> Map(id -> puzzle).
export async function getPuzzlesByIds(ids) {
  const valid = [...new Set(ids.filter((id) => typeof id === "string" && SLUG.test(id)))];
  const rows = await puzzleStore.getBySlugs(valid);
  return new Map(rows.map(({ testCount, ownerId, ...p }) => [p.id, { ...p, hasTests: testCount > 0 }]));
}

// The only test data that is safe to send to the browser: visible cases
// (input + expected) and a count of hidden ones.
export function getClientTestInfo(puzzle) {
  const sampleTests = puzzle.testCases
    .filter((t) => !t.hidden)
    .map(({ input, expected }) => ({ input, expected }));
  return {
    checkable: puzzle.testCases.length > 0,
    sampleTests,
    hiddenTestCount: puzzle.testCases.length - sampleTests.length,
  };
}
