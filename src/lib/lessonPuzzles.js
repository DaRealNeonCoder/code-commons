import { getPuzzleById } from "@/lib/puzzles";
import { getLessonById } from "@/lib/lessons";

// IDs are filenames in content/lessons and content/puzzles, so restrict them
// to safe slug characters before they ever reach the filesystem (blocks "../"
// tricks, including from URL query params).
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

// Returns the IDs that are malformed or don't match an existing puzzle.
export function findMissingPuzzleIds(ids) {
  return ids.filter((id) => !PUZZLE_ID_PATTERN.test(id) || !getPuzzleById(id));
}

// Resolves a lesson's `puzzles` array into an ordered chain of display info.
// IDs that no longer match a puzzle are skipped so a deleted puzzle can't break
// the lesson. Only display fields are returned, never test cases.
export function getLinkedPuzzles(ids) {
  return normalizePuzzleIds(ids)
    .filter((id) => PUZZLE_ID_PATTERN.test(id))
    .map((id) => getPuzzleById(id))
    .filter(Boolean)
    .map((puzzle) => ({
      id: puzzle.id,
      title: puzzle.title || puzzle.id,
      summary: puzzle.summary || "",
      difficulty: puzzle.difficulty,
      // Matches the puzzle page, which treats a missing `available` as coming soon.
      available: Boolean(puzzle.available),
    }));
}

// The puzzle that follows `puzzleId` in `lessonId`'s chain, or null.
//
// Puzzles carry no chain data of their own. The lesson's `puzzles` array is the
// only source of truth: lesson -> puzzles[0] -> puzzles[1] -> ... The lesson ID
// arrives from the URL (?lesson=...), so it's validated, and the puzzle must
// actually be in that lesson's chain or we return null. Standalone puzzles and
// the last puzzle in a chain therefore get no next step.
export function getNextPuzzleInChain(lessonId, puzzleId) {
  if (typeof lessonId !== "string" || !LESSON_ID_PATTERN.test(lessonId)) return null;
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;

  const chain = getLinkedPuzzles(lesson.puzzles);
  const index = chain.findIndex((p) => p.id === puzzleId);
  if (index === -1) return null;

  // Skip any later puzzles that aren't published yet.
  return chain.slice(index + 1).find((p) => p.available) ?? null;
}