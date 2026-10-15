import assert from "node:assert/strict";
import test from "node:test";
import { checkMathQuiz, getClientMathQuizInfo, normalizeMathQuiz } from "./mathQuiz.js";

const quiz = {
  version: 1,
  questions: [
    {
      id: "q1",
      prompt: "What is 2 + 2?",
      type: "choice",
      choices: [{ id: "a", label: "3" }, { id: "b", label: "4" }],
      answer: "b",
    },
    { id: "q2", prompt: "Enter x: x + 1 = 6", type: "numeric", answer: "5" },
  ],
};

test("normalizes valid math quizzes and removes answer keys from client data", () => {
  assert.deepEqual(normalizeMathQuiz(quiz), quiz);
  assert.deepEqual(getClientMathQuizInfo(quiz), {
    version: 1,
    questions: [
      { id: "q1", prompt: "What is 2 + 2?", type: "choice", choices: [{ id: "a", label: "3" }, { id: "b", label: "4" }] },
      { id: "q2", prompt: "Enter x: x + 1 = 6", type: "numeric" },
    ],
  });
});

test("checks choices, numeric equivalents, and variables", () => {
  assert.deepEqual(checkMathQuiz(quiz, { q1: "b", q2: "5.0" }).results.map((r) => r.status), ["pass", "pass"]);
  assert.deepEqual(checkMathQuiz({ version: 1, questions: [{ id: "q", prompt: "Name the variable", type: "numeric", answer: "x" }] }, { q: "x" }).results[0].status, "pass");
  assert.equal(checkMathQuiz(quiz, { q1: "a", q2: "5" }).passed, 1);
  assert.equal(checkMathQuiz(quiz, { q1: "b" }), null);
});

test("rejects malformed or leaked answer configurations", () => {
  assert.equal(normalizeMathQuiz({ version: 1, questions: [{ id: "q", prompt: "", type: "numeric", answer: "1" }] }), null);
  assert.equal(normalizeMathQuiz({ version: 1, questions: [{ id: "q", prompt: "x", type: "choice", choices: [{ id: "a", label: "1" }, { id: "b", label: "2" }], answer: "c" }] }), null);
  assert.equal(getClientMathQuizInfo(quiz).questions[0].answer, undefined);
});
