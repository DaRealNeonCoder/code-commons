import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";
import { compileReactDemo } from "../ccreact/src/compiler.js";

const course = JSON.parse(
  await readFile(new URL("../content/courses/intro-to-ai-machine-learning.json", import.meta.url), "utf8"),
);

test("interactive demos in the ML course compile through the restricted runner", async () => {
  const expectedDemoLessons = new Set([
    "foundations-of-machine-learning",
    "vectors-and-dot-products",
    "norms-and-shapes",
    "matrices-and-multiplication",
    "calculus-derivatives",
    "derivative-rules",
    "chain-rule-computational-graphs",
    "gradients-and-partial-derivatives",
    "gradient-descent",
    "data-and-train-test-splits",
    "linear-regression",
    "probability-logistic-regression",
    "evaluating-models-honestly",
    "neurons-layers-mlps",
    "single-neuron-learning",
    "backpropagation",
    "softmax-and-cross-entropy",
    "digit-recognizer",
    "convolutions",
    "language-model-next-word",
  ]);

  for (const lessonId of expectedDemoLessons) {
    assert.ok(course.lessons.includes(lessonId), `${lessonId} is not in the ML course`);
    const source = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
    const demos = [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)];
    assert.equal(demos.length, 1, `${lessonId} should contain exactly one React demo`);
    await compileReactDemo(demos[0][1], { maxSourceChars: 20_000, maxCompiledChars: 120_000 });
  }
});

test("ML lesson MDX with demos parses when JavaScript attributes are allowed", async () => {
  for (const lessonId of course.lessons) {
    const source = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
    await serialize(source, { blockJS: false });
  }
});
