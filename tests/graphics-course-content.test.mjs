import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";
import { compileReactDemo } from "../ccreact/src/compiler.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { getShaderPuzzle } from "../src/lib/shaders/puzzle.js";

const course = JSON.parse(
  await readFile(new URL("../content/courses/computer-graphics-and-shaders.json", import.meta.url), "utf8"),
);

async function readContent(directory, id) {
  return readFile(new URL(`../content/${directory}/${id}.mdx`, import.meta.url), "utf8");
}

test("Computer Graphics & Shaders has an ordered, complete learning path", async () => {
  assert.equal(course.lessons.length, 16);
  const orders = [];
  const shaderRefs = [];
  const lessonText = [];

  for (const lessonId of course.lessons) {
    const source = await readContent("lessons", lessonId);
    const { data } = parseFrontmatter(source);
    lessonText.push(source);
    orders.push(data.order);
    assert.ok(data.summary, `${lessonId} needs a learner-facing summary`);
    assert.ok(Array.isArray(data.puzzles) && data.puzzles.length > 0, `${lessonId} needs a verifiable checkpoint`);
    assert.ok(source.includes("<ReactDemo"), `${lessonId} needs an interactive demo`);

    for (const ref of data.puzzles) {
      assert.match(ref, /^shader:/, `${lessonId} should use a shader checkpoint`);
      const shaderId = ref.slice("shader:".length);
      shaderRefs.push(shaderId);
      const shaderSource = await readContent("shaders", shaderId);
      const { data: shader } = parseFrontmatter(shaderSource);
      assert.ok(shader.title, `${shaderId} needs a title`);
      if (shader.shaderPuzzle) getShaderPuzzle(shader.shaderPuzzle);
      if (shader.runtime === "programmable-3d") {
        assert.equal(typeof shader.sourceFiles?.cpu, "string", `${shaderId} needs CPU source`);
        assert.equal(typeof shader.sourceFiles?.vertex, "string", `${shaderId} needs vertex source`);
        assert.equal(typeof shader.sourceFiles?.fragment, "string", `${shaderId} needs fragment source`);
        assert.match(shader.sourceFiles.cpu, /function\s+setup\s*\(/);
        assert.match(shader.sourceFiles.vertex, /gl_Position/);
        assert.match(shader.sourceFiles.fragment, /gl_FragColor/);
      }
    }
  }

  assert.deepEqual(orders, Array.from({ length: course.lessons.length }, (_, index) => index + 1));
  assert.ok(shaderRefs.includes("programmable-3d-cube"));
  assert.ok(shaderRefs.includes("graphics-raymarched-spheres"));
  assert.ok(lessonText.some((source) => source.includes("fragment-only")));
  assert.ok(lessonText.some((source) => source.includes("setup(engine)")));
  assert.ok(lessonText.some((source) => source.includes("no image loader")));
});

test("graphics course React demos compile in codeloop's restricted runner", async () => {
  for (const lessonId of course.lessons) {
    const source = await readContent("lessons", lessonId);
    const demos = [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)];
    assert.equal(demos.length, 1, `${lessonId} should contain exactly one React demo`);
    await compileReactDemo(demos[0][1], { maxSourceChars: 20_000, maxCompiledChars: 120_000 });
    await serialize(source, { blockJS: false });
  }
});
