import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { compareShaderPixels, getShaderPuzzle } from "../src/lib/shaders/puzzle.js";

const { data } = parseFrontmatter(readFileSync(new URL("../content/shaders/checkerboard-puzzle.mdx", import.meta.url), "utf8"));
const config = getShaderPuzzle(data.shaderPuzzle);

test("showcase configuration validates; malformed puzzle settings are rejected", () => {
  assert.equal(config.width, 96);
  assert.equal(getShaderPuzzle(null), null);
  for (const patch of [
    { width: 0 }, { height: 513 }, { width: 16.5 },
    { tolerance: NaN }, { tolerance: -1 }, { tolerance: 1.1 },
    { requiredMatch: 0 }, { requiredMatch: 1.1 },
    { referenceImage: "https://example.com/image.png" }, { referenceImage: "" },
  ]) assert.throws(() => getShaderPuzzle({ ...config, ...patch }));
});

test("a pixel must satisfy tolerance on every RGB channel", () => {
  const settings = { width: 1, height: 1, tolerance: 20 / 255, requiredMatch: 1 };
  assert.equal(compareShaderPixels([100, 100, 100, 255], [120, 80, 100, 255], settings).solved, true);
  assert.equal(compareShaderPixels([100, 100, 100, 255], [121, 100, 100, 255], settings).solved, false);
});

test("required pixel fraction is inclusive and incorrect images fail", () => {
  const settings = { width: 2, height: 2, tolerance: 0, requiredMatch: 0.75 };
  const reference = new Uint8Array(16).fill(255);
  const candidate = reference.slice();
  candidate[0] = 0;
  assert.deepEqual(compareShaderPixels(reference, candidate, settings), { solved: true, matchRatio: 0.75 });
  candidate[4] = 0;
  assert.deepEqual(compareShaderPixels(reference, candidate, settings), { solved: false, matchRatio: 0.5 });
  assert.throws(() => compareShaderPixels(reference, candidate.slice(4), settings));
});
