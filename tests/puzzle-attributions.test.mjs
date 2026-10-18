import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const puzzleDirectory = new URL("../content/puzzles/", import.meta.url);
const footer = '<p className="mt-8 text-[10px] text-zinc-400 dark:text-zinc-600">See the <a href="/credits">credit doc</a> for references.</p>';

test("puzzle attributions live in the credit document", async () => {
  const files = (await readdir(puzzleDirectory)).filter((file) => file.endsWith(".mdx"));
  const sources = await Promise.all(files.map(async (file) => [file, await readFile(new URL(file, puzzleDirectory), "utf8")]));
  const withCredits = sources.filter(([, source]) => source.includes(footer));
  const document = await readFile(new URL("docs/puzzle-attributions.md", root), "utf8");

  assert.equal(withCredits.length, 125);
  assert.equal((document.match(/^\*Adapted from/gm) || []).length, 125);
  assert.equal((document.match(/^(?:The images were|The scoreboard image|The screenshots above|The chessboard image)/gm) || []).length, 4);
  assert.equal(sources.filter(([, source]) => /(^|\n)\*Adapted from|^## Credit/m.test(source)).length, 0);
  assert.equal(sources.filter(([, source]) => !source.trimEnd().endsWith(footer)).length, files.length - withCredits.length);
});
