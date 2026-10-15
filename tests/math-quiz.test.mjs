import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { checkMathQuiz, getClientMathQuizInfo, normalizeMathQuiz } from "../src/lib/mathQuiz.js";
import { getType, PROJECT_TYPES, TYPE_IDS } from "../src/lib/creatorTypes.js";

const { data } = parseFrontmatter(readFileSync(new URL("../content/puzzles/test-math-puzzle.mdx", import.meta.url), "utf8"));
const quiz = normalizeMathQuiz(data.mathQuiz);

test("the test math puzzle has a valid quiz configuration", () => {
  assert.ok(quiz);
  assert.equal(quiz.questions.length, 2);
  assert.equal(quiz.questions[0].answer, "b");
});

test("client quiz data does not expose answer keys", () => {
  const clientQuiz = getClientMathQuizInfo(quiz);
  assert.ok(clientQuiz);
  assert.equal("answer" in clientQuiz.questions[0], false);
  assert.equal("answer" in clientQuiz.questions[1], false);
  assert.deepEqual(clientQuiz.questions[0].choices[1], { id: "b", label: "42" });
});

test("choice and numeric answers are checked together", () => {
  assert.deepEqual(checkMathQuiz(quiz, { q1: "b", q2: "7.0" }), {
    passed: 2,
    total: 2,
    results: [
      { questionId: "q1", status: "pass" },
      { questionId: "q2", status: "pass" },
    ],
  });
  assert.equal(checkMathQuiz(quiz, { q1: "a", q2: "7" }).passed, 1);
  assert.equal(checkMathQuiz(quiz, { q1: "b" }), null);
});

test("the create menu exposes a math puzzle preset backed by the puzzle editor", () => {
  const mathPuzzle = PROJECT_TYPES.find((type) => type.id === "math-puzzle");
  assert.deepEqual(mathPuzzle.initialData, { kind: "math-quiz" });
  assert.equal(mathPuzzle.projectType, "puzzle");
  assert.equal(TYPE_IDS.includes("math-puzzle"), false);
  assert.equal(getType("puzzle").id, "puzzle");
});
