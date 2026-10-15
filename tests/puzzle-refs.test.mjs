import test from "node:test";
import assert from "node:assert/strict";
import { normalizePuzzleRefs, parsePuzzleRef, puzzleHref } from "../src/lib/puzzleRefs.js";

test("legacy puzzle IDs become typed refs and duplicates are removed", () => {
  assert.deepEqual(normalizePuzzleRefs(["two-sum", "shader:glow", "two-sum", "circuit:half-adder"]), [
    "puzzle:two-sum",
    "shader:glow",
    "circuit:half-adder",
  ]);
  assert.deepEqual(parsePuzzleRef("shader:glow"), { type: "shader", id: "glow" });
});

test("typed refs route to the matching puzzle page", () => {
  assert.equal(puzzleHref("puzzle:two-sum", "lesson=intro"), "/puzzles/two-sum?lesson=intro");
  assert.equal(puzzleHref("shader:glow"), "/shaders/glow");
  assert.equal(puzzleHref("circuit:half-adder"), "/circuits/half-adder");
  assert.equal(puzzleHref("bad ref"), null);
});
