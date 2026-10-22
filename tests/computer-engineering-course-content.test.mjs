import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";
import { compileReactDemo } from "../ccreact/src/compiler.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { normalizeMathQuiz } from "../src/lib/mathQuiz.js";
import { parseCircuit } from "../src/lib/circuits/circuitData.js";
import { getPuzzlePorts, getPuzzleTests, validatePuzzleCircuit } from "../src/lib/circuits/puzzle.js";

const course = JSON.parse(
  await readFile(new URL("../content/courses/intro-to-computer-engineering.json", import.meta.url), "utf8"),
);

const expectedLessons = [
  "what-is-a-computer-made-of",
  "bits-binary-and-digital-signals",
  "true-false-and-boolean-logic",
  "the-not-gate",
  "the-and-gate",
  "the-or-gate",
  "the-nand-gate",
  "the-xor-gate",
  "truth-tables-and-circuit-reasoning",
  "combining-gates",
  "combinational-logic-versus-state",
  "designing-a-circuit-from-a-specification",
];

async function readContent(directory, id) {
  return readFile(new URL(`../content/${directory}/${id}.mdx`, import.meta.url), "utf8");
}

test("Intro to Computer Engineering has a complete beginner path", async () => {
  assert.deepEqual(course.lessons, expectedLessons);

  for (const [index, lessonId] of course.lessons.entries()) {
    const source = await readContent("lessons", lessonId);
    const { data } = parseFrontmatter(source);
    assert.equal(data.order, index + 1, `${lessonId} should have sequential order`);
    assert.ok(data.summary, `${lessonId} needs a learner-facing summary`);
    assert.ok(data.available, `${lessonId} should be available`);
    assert.equal(data.difficulty, "beginner", `${lessonId} should stay introductory`);
    assert.ok(Array.isArray(data.puzzles) && data.puzzles.length > 0, `${lessonId} needs a checkpoint`);
    assert.equal([...source.matchAll(/code=\{`([\s\S]*?)`\}/g)].length, 1, `${lessonId} should have one focused demo`);
    await serialize(source, { blockJS: false });

    for (const ref of data.puzzles) {
      const [kind, id] = ref.includes(":") ? ref.split(":", 2) : ["puzzle", ref];
      const directory = kind === "circuit" ? "circuits" : "puzzles";
      const puzzleSource = await readContent(directory, id);
      const { data: puzzle } = parseFrontmatter(puzzleSource);
      assert.ok(puzzle.title, `${ref} needs a title`);
      if (kind === "circuit") {
        const starter = parseCircuit(puzzle.starterCircuit);
        const ports = getPuzzlePorts(puzzle.puzzlePorts, starter);
        const tests = getPuzzleTests(puzzle.testCases, ports);
        validatePuzzleCircuit(starter, ports);
        assert.ok(tests.length >= 4, `${ref} should test multiple input combinations`);
      } else if (puzzle.kind === "math-quiz") {
        assert.ok(normalizeMathQuiz(puzzle.mathQuiz), `${ref} needs a valid math quiz`);
      }
    }
  }
});

test("intro computer engineering demos compile in the restricted runner", async () => {
  for (const lessonId of course.lessons) {
    const source = await readContent("lessons", lessonId);
    const demos = [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)];
    await compileReactDemo(demos[0][1], { maxSourceChars: 20_000, maxCompiledChars: 120_000 });
  }
});
