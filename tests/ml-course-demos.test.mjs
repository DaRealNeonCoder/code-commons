import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";
import { compileReactDemo } from "../ccreact/src/compiler.js";

const introCourse = JSON.parse(
  await readFile(new URL("../content/courses/intro-to-ai-machine-learning.json", import.meta.url), "utf8"),
);
const advancedCourse = JSON.parse(
  await readFile(new URL("../content/courses/advanced-machine-learning.json", import.meta.url), "utf8"),
);

async function assertCourseDemos(course, courseName, lessonsWithoutDemos = new Set()) {
  for (const lessonId of course.lessons) {
    const source = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
    const demos = [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)];
    if (lessonsWithoutDemos.has(lessonId)) {
      assert.equal(demos.length, 0, `${courseName}/${lessonId} should not unexpectedly contain a React demo`);
      continue;
    }
    assert.equal(demos.length, 1, `${courseName}/${lessonId} should contain exactly one React demo`);
    await compileReactDemo(demos[0][1], { maxSourceChars: 20_000, maxCompiledChars: 120_000 });
  }
}

test("interactive demos in the Intro and Advanced ML courses compile", async () => {
  await assertCourseDemos(introCourse, "intro-to-ai-machine-learning", new Set(["tuning-and-scikit-learn"]));
  await assertCourseDemos(advancedCourse, "advanced-machine-learning");
});

test("Intro and Advanced ML lesson MDX parses with JavaScript attributes allowed", async () => {
  for (const course of [introCourse, advancedCourse]) {
    for (const lessonId of course.lessons) {
      const source = await readFile(new URL(`../content/lessons/${lessonId}.mdx`, import.meta.url), "utf8");
      await serialize(source, { blockJS: false });
    }
  }
});
