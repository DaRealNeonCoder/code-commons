import { getLesson } from "@/lib/lessonStore";
import { getPuzzleChoicesByRefs } from "@/lib/puzzleChoices";
import { normalizePuzzleRef, normalizePuzzleRefs, parsePuzzleRef, PUZZLE_ID_PATTERN } from "@/lib/puzzleRefs";

export { PUZZLE_ID_PATTERN } from "@/lib/puzzleRefs";

export const LESSON_ID_PATTERN = PUZZLE_ID_PATTERN;

// Trim, convert legacy unprefixed IDs to puzzle:<id>, and remove duplicates
// while keeping order. Namespaced refs let lesson chains include records from
// all three puzzle tables without relying on globally unique slugs.
export function normalizePuzzleIds(value) {
  return normalizePuzzleRefs(value);
}

// The refs that are malformed or don't match an existing puzzle, shader, or
// circuit puzzle.
export async function findMissingPuzzleIds(ids) {
  const refs = normalizePuzzleRefs(ids);
  const found = await getPuzzleChoicesByRefs(refs);
  return refs.filter((ref) => !found.has(ref));
}

// Sync half: turns a lesson's puzzle refs into display info, given a Map(ref ->
// choice) that was already loaded. The id fallback keeps older callers safe.
export function resolveLinkedPuzzles(ids, choicesByRef) {
  return normalizePuzzleRefs(ids)
    .map((ref) => {
      const parsed = parsePuzzleRef(ref);
      return choicesByRef.get(ref) ?? choicesByRef.get(parsed?.id);
    })
    .filter(Boolean)
    .map((choice) => ({
      ref: choice.ref,
      id: choice.id,
      type: choice.type,
      typeLabel: choice.typeLabel,
      title: choice.title || choice.id,
      summary: choice.summary || "",
      difficulty: choice.difficulty || "",
      available: Boolean(choice.available),
    }));
}

// Resolves a lesson's puzzle refs into an ordered chain of display info.
export async function getLinkedPuzzles(ids) {
  const clean = normalizePuzzleRefs(ids);
  if (clean.length === 0) return [];
  return resolveLinkedPuzzles(clean, await getPuzzleChoicesByRefs(clean));
}

// The puzzle that follows a current ref in a lesson chain, or null. The
// lesson's refs are the only source of truth, and the current puzzle must
// really be in it.
export async function getNextPuzzleInChain(lessonId, puzzleId, puzzleType = "puzzle") {
  if (typeof lessonId !== "string" || !LESSON_ID_PATTERN.test(lessonId)) return null;
  const lesson = await getLesson(lessonId);
  if (!lesson) return null;

  const currentRef = normalizePuzzleRef(`${puzzleType}:${puzzleId}`);
  const chain = await getLinkedPuzzles(lesson.puzzles);
  const index = chain.findIndex((puzzle) => puzzle.ref === currentRef);
  if (index === -1) return null;

  return chain.slice(index + 1).find((puzzle) => puzzle.available) ?? null;
}
