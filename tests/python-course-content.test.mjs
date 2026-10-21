import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";
import { compileReactDemo } from "../ccreact/src/compiler.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";

const course = JSON.parse(
  await readFile(new URL("../content/courses/intro-to-python.json", import.meta.url), "utf8"),
);

const demoLessons = new Set([
  "how-python-runs",
  "problem-solving-and-tracing",
  "loop-patterns",
  "choosing-data-structures",
  "functions-in-practice",
  "debugging-and-errors",
  "files-and-modules",
  "expense-tracker-project",
]);

test("Intro to Python references valid lessons and beginner puzzles", async () => {
  assert.equal(course.lessons.length, 18);
  const orders = [];

  for (const lessonId of course.lessons) {
    const lessonSource = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
    const { data } = parseFrontmatter(lessonSource);
    orders.push(data.order);
    assert.ok(Array.isArray(data.puzzles) && data.puzzles.length > 0, `${lessonId} needs a puzzle`);
    await serialize(lessonSource, { blockJS: false });

    for (const puzzleId of data.puzzles) {
      const puzzleSource = await readFile(new URL(`../content/puzzles/${puzzleId}.mdx`, import.meta.url), "utf8");
      const { data: puzzle } = parseFrontmatter(puzzleSource);
      assert.ok((puzzle.languages || []).includes("python"), `${puzzleId} should be marked Python`);
      assert.ok((puzzle.testCases || []).some((testCase) => !testCase.hidden), `${puzzleId} needs a visible example`);
    }
  }

  assert.deepEqual(orders, Array.from({ length: course.lessons.length }, (_, index) => index + 1));
});

test("new Intro to Python interactive demos compile through the restricted runner", async () => {
  for (const lessonId of demoLessons) {
    assert.ok(course.lessons.includes(lessonId), `${lessonId} is not in the Intro to Python course`);
    const source = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
    const demos = [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)];
    assert.equal(demos.length, 1, `${lessonId} should contain exactly one React demo`);
    await compileReactDemo(demos[0][1], { maxSourceChars: 20_000, maxCompiledChars: 120_000 });
  }
});
