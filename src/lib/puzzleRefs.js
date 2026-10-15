export const PUZZLE_TYPES = ["puzzle", "shader", "circuit"];

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;
const REF = /^(puzzle|shader|circuit):([a-z0-9][a-z0-9_-]*)$/i;

export const PUZZLE_REF_PATTERN = REF;
export const PUZZLE_ID_PATTERN = SLUG;

// Existing lessons stored unprefixed puzzle IDs. Treat those as regular
// puzzle-table entries while new references are namespaced so IDs can safely
// overlap across puzzle, shader, and circuit tables.
export function parsePuzzleRef(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  const match = text.match(REF);
  if (match) return { type: match[1].toLowerCase(), id: match[2] };
  if (SLUG.test(text)) return { type: "puzzle", id: text };
  return null;
}

export function normalizePuzzleRef(value) {
  const parsed = parsePuzzleRef(value);
  return parsed ? `${parsed.type}:${parsed.id}` : null;
}

export function normalizePuzzleRefs(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const refs = [];
  for (const item of value) {
    const ref = normalizePuzzleRef(item);
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    refs.push(ref);
  }
  return refs;
}

export const PUZZLE_TYPE_LABELS = {
  puzzle: "Coding / math",
  shader: "Shader puzzle",
  circuit: "Circuit puzzle",
};

export const PUZZLE_TYPE_PATHS = {
  puzzle: "/puzzles",
  shader: "/shaders",
  circuit: "/circuits",
};

export function puzzleHref(ref, query = "") {
  const parsed = parsePuzzleRef(ref);
  if (!parsed) return null;
  return `${PUZZLE_TYPE_PATHS[parsed.type]}/${encodeURIComponent(parsed.id)}${query ? `?${query}` : ""}`;
}
