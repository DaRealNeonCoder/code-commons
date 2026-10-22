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
  await readFile(new URL("../content/courses/intro-to-computer-engineering-part-2.json", import.meta.url), "utf8"),
);

const expectedLessons = [
  "why-computers-need-memory",
  "feedback-and-circular-circuits",
  "the-sr-latch",
  "storing-a-bit-with-a-latch",
  "clock-signals-and-synchronous-systems",
  "the-d-flip-flop",
  "registers-and-multi-bit-storage",
  "binary-numbers-and-bit-width",
  "unsigned-binary-arithmetic",
  "building-a-half-adder",
  "building-a-full-adder",
  "building-a-multi-bit-adder",
  "subtraction-and-twos-complement",
  "overflow-and-arithmetic-limits",
  "multiplexers-and-data-selection",
  "demultiplexers-and-decoding",
  "decoders-and-control-signals",
  "building-a-simple-arithmetic-logic-unit",
  "counters-and-sequential-circuits",
  "combining-storage-and-computation",
  "designing-reusable-circuit-components",
  "connecting-computer-components",
];

async function readContent(directory, id) {
  return readFile(new URL(`../content/${directory}/${id}.mdx`, import.meta.url), "utf8");
}

test("Computer Engineering Part 2 has the requested beginner progression", async () => {
  assert.deepEqual(course.lessons, expectedLessons);

  for (const [index, lessonId] of course.lessons.entries()) {
    const source = await readContent("lessons", lessonId);
    const { data } = parseFrontmatter(source);
    assert.equal(data.order, index + 1, `${lessonId} should have sequential order`);
    assert.ok(data.summary, `${lessonId} needs a learner-facing summary`);
    assert.equal(data.available, true, `${lessonId} should be available`);
    assert.equal(data.difficulty, "beginner", `${lessonId} should stay beginner friendly`);
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
        assert.ok(tests.length >= 4, `${ref} should test multiple cases`);
      } else {
        assert.ok(normalizeMathQuiz(puzzle.mathQuiz), `${ref} needs a valid math quiz`);
      }
    }
  }
});

test("Part 2 React demos compile in the restricted runner", async () => {
  for (const lessonId of course.lessons) {
    const source = await readContent("lessons", lessonId);
    const demo = [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)][0][1];
    await compileReactDemo(demo, { maxSourceChars: 20_000, maxCompiledChars: 120_000 });
  }
});
