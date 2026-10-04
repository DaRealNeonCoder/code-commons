import { sql } from "drizzle-orm";
import { puzzles, shaders, circuits, builds } from "./schema";
import { createContentStore } from "./content";

// Test cases and starter code are "heavy": left out of lists and light reads.
// testCount lets list pages know a puzzle is checkable without selecting the answers.
export const puzzleStore = createContentStore(puzzles, {
  fallback: "puzzle",
  heavy: ["starterCode", "testCases"],
  listExtra: { testCount: sql`jsonb_array_length(${puzzles.testCases})`.mapWith(Number) },
});

export const shaderStore = createContentStore(shaders, { fallback: "shader", heavy: ["starterCode"] });
export const circuitStore = createContentStore(circuits, { fallback: "circuit", heavy: ["starterCircuit"] });
export const buildStore = createContentStore(builds, { fallback: "build", heavy: ["starterCode"] });
