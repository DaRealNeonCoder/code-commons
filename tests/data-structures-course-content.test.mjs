import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";
import { compileReactDemo } from "../ccreact/src/compiler.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";

const course = JSON.parse(
  await readFile(new URL("../content/courses/data-structures-and-algorithms.json", import.meta.url), "utf8"),
);

test("Data Structures & Algorithms references an ordered, complete lesson sequence", async () => {
  assert.equal(course.lessons.length, 14);
  const orders = [];

  for (const lessonId of course.lessons) {
    const lessonSource = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
    const { data } = parseFrontmatter(lessonSource);
    orders.push(data.order);
    assert.equal(data.difficulty, "beginner", `${lessonId} should be accessible to Intro to Python learners`);
    assert.ok((data.languages || []).includes("python"), `${lessonId} should be marked Python`);
    assert.ok(Array.isArray(data.puzzles) && data.puzzles.length > 0, `${lessonId} needs a puzzle`);
    await serialize(lessonSource, { blockJS: false });

    for (const puzzleId of data.puzzles) {
      const puzzleSource = await readFile(new URL(`../content/puzzles/${puzzleId}.mdx`, import.meta.url), "utf8");
      const { data: puzzle } = parseFrontmatter(puzzleSource);
      assert.ok((puzzle.languages || []).includes("python"), `${puzzleId} should be marked Python`);
      assert.ok((puzzle.testCases || []).some((testCase) => !testCase.hidden), `${puzzleId} needs a visible example`);
      assert.ok((puzzle.testCases || []).some((testCase) => testCase.hidden), `${puzzleId} needs a hidden edge case`);
    }
  }

  assert.deepEqual(orders, Array.from({ length: course.lessons.length }, (_, index) => index + 1));
});

test("Data Structures & Algorithms demos compile through the restricted runner", async () => {
  for (const lessonId of course.lessons) {
    const source = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
    const demos = [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)];
    assert.equal(demos.length, 1, `${lessonId} should contain exactly one React demo`);
    await compileReactDemo(demos[0][1], { maxSourceChars: 20_000, maxCompiledChars: 120_000 });
  }
});
