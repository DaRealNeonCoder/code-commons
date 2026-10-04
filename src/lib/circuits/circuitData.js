// Pure helpers (no DB, no React) so routes, pages and the import script can share them.

export const EMPTY_CIRCUIT = { components: [], connections: [], chips: {} };

// Accepts a circuit object or a JSON string of one. Returns a clean
// { components, connections, chips } or null if it isn't one.
export function parseCircuit(value) {
  let c = value;
  if (typeof c === "string") {
    try {
      c = JSON.parse(c);
    } catch {
      return null;
    }
  }
  if (
    !c ||
    typeof c !== "object" ||
    !Array.isArray(c.components) ||
    !Array.isArray(c.connections) ||
    !c.chips ||
    typeof c.chips !== "object" ||
    Array.isArray(c.chips)
  ) {
    return null;
  }
  if (c.components.length > 2000 || c.connections.length > 5000) return null;
  return { components: c.components, connections: c.connections, chips: c.chips };
}
