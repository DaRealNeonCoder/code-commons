import { getPuzzlesByIds } from "@/lib/puzzles";
import { getLesson } from "@/lib/lessonStore";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
export const PUZZLE_ID_PATTERN = SLUG_PATTERN;
export const LESSON_ID_PATTERN = SLUG_PATTERN;

// Trim, drop blanks and non-strings, and remove duplicates while keeping order.
export function normalizePuzzleIds(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const ids = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

// The IDs that are malformed or don't match an existing puzzle.
export async function findMissingPuzzleIds(ids) {
  const found = await getPuzzlesByIds(ids.filter((id) => PUZZLE_ID_PATTERN.test(id)));
  return ids.filter((id) => !found.has(id));
}

// Sync half: turns a lesson's `puzzles` ids into display info, given a
// Map(id -> puzzle) that was already loaded. Missing ids are skipped.
export function resolveLinkedPuzzles(ids, puzzlesById) {
  return normalizePuzzleIds(ids)
    .filter((id) => PUZZLE_ID_PATTERN.test(id))
    .map((id) => puzzlesById.get(id))
    .filter(Boolean)
    .map((puzzle) => ({
      id: puzzle.id,
      title: puzzle.title || puzzle.id,
      summary: puzzle.summary || "",
      difficulty: puzzle.difficulty,
      available: Boolean(puzzle.available),
    }));
}

// Resolves a lesson's `puzzles` array into an ordered chain of display info (one
// query). Only display fields are returned, never test cases.
export async function getLinkedPuzzles(ids) {
  const clean = normalizePuzzleIds(ids).filter((id) => PUZZLE_ID_PATTERN.test(id));
  if (clean.length === 0) return [];
  return resolveLinkedPuzzles(clean, await getPuzzlesByIds(clean));
}

// The puzzle that follows `puzzleId` in `lessonId`'s chain, or null. The lesson's
// `puzzles` array is the only source of truth, and the puzzle must really be in it.
export async function getNextPuzzleInChain(lessonId, puzzleId) {
  if (typeof lessonId !== "string" || !LESSON_ID_PATTERN.test(lessonId)) return null;
  const lesson = await getLesson(lessonId);
  if (!lesson) return null;

  const chain = await getLinkedPuzzles(lesson.puzzles);
  const index = chain.findIndex((p) => p.id === puzzleId);
  if (index === -1) return null;

  return chain.slice(index + 1).find((p) => p.available) ?? null;
}
