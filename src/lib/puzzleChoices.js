import { puzzleStore, shaderStore, circuitStore } from "@/lib/db/stores";
import { normalizePuzzleRefs, PUZZLE_TYPE_LABELS } from "@/lib/puzzleRefs";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function toChoice(item, type) {
  return {
    ref: `${type}:${item.id}`,
    id: item.id,
    type,
    typeLabel: type === "puzzle" && item.kind === "math-quiz" ? "Math puzzle" : type === "puzzle" ? "Coding puzzle" : PUZZLE_TYPE_LABELS[type],
    title: item.title || item.id,
    summary: item.summary || "",
    difficulty: item.difficulty || "",
    available: Boolean(item.available),
  };
}

// Choices are intentionally light and capped. The editor asks this function
// again when the user searches instead of shipping the entire content catalog
// in the initial page response.
export async function getPuzzleChoices({ query = "", limit = DEFAULT_LIMIT, selectedRefs = [] } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const search = typeof query === "string" ? query.trim() : "";
  const refs = normalizePuzzleRefs(selectedRefs);
  const [puzzles, shaders, circuits, selected] = await Promise.all([
    puzzleStore.list({ onlyAvailable: false, query: search, limit: safeLimit }),
    shaderStore.list({ onlyAvailable: false, query: search, limit: safeLimit }),
    circuitStore.list({ onlyAvailable: false, query: search, limit: safeLimit }),
    getPuzzleChoicesByRefs(refs),
  ]);

  const found = [
    ...puzzles.map((item) => toChoice(item, "puzzle")),
    ...shaders.filter((item) => item.isPuzzle).map((item) => toChoice(item, "shader")),
    ...circuits.filter((item) => item.isPuzzle).map((item) => toChoice(item, "circuit")),
  ];
  const byRef = new Map();
  for (const item of [...selected.values(), ...found]) byRef.set(item.ref, item);

  const selectedSet = new Set(refs);
  const selectedItems = refs.map((ref) => byRef.get(ref)).filter(Boolean);
  const matches = found.filter((item) => !selectedSet.has(item.ref));
  return [...selectedItems, ...matches.slice(0, safeLimit)];
}

export async function getPuzzleChoicesByRefs(refs) {
  const normalized = normalizePuzzleRefs(refs);
  const grouped = { puzzle: [], shader: [], circuit: [] };
  for (const ref of normalized) {
    const separator = ref.indexOf(":");
    const type = ref.slice(0, separator);
    const id = ref.slice(separator + 1);
    if (grouped[type]) grouped[type].push(id);
  }

  const [puzzles, shaders, circuits] = await Promise.all([
    puzzleStore.getBySlugs(grouped.puzzle),
    shaderStore.getBySlugs(grouped.shader),
    circuitStore.getBySlugs(grouped.circuit),
  ]);
  const items = [
    ...puzzles.map((item) => toChoice(item, "puzzle")),
    ...shaders.filter((item) => item.isPuzzle).map((item) => toChoice(item, "shader")),
    ...circuits.filter((item) => item.isPuzzle).map((item) => toChoice(item, "circuit")),
  ];
  return new Map(items.map((choice) => [choice.ref, choice]));
}
