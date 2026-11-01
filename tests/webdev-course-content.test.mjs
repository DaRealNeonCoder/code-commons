import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { getClientWebInfo, normalizeWebConfig } from "../src/lib/web/webPuzzle.js";

const course = JSON.parse(
  await readFile(new URL("../content/courses/intro-to-web-development.json", import.meta.url), "utf8"),
);

async function readContent(folder, id) {
  return readFile(new URL(`../content/${folder}/${id}.mdx`, import.meta.url), "utf8");
}

test("Intro to Web Development has 35 ordered lessons", () => {
  assert.equal(course.lessons.length, 35);
  assert.equal(new Set(course.lessons).size, course.lessons.length, "lesson ids must be unique");
});

test("every lesson is valid, ordered, and linked to a web puzzle", async () => {
  for (const [index, lessonId] of course.lessons.entries()) {
    const source = await readContent("lessons", lessonId);
    const { data, content } = parseFrontmatter(source);

    assert.equal(data.order, index + 1, `${lessonId} must have order ${index + 1}`);
    assert.equal(data.available, true, `${lessonId} must be available`);
    assert.ok((data.languages || []).some((language) => ["html", "css", "javascript"].includes(language)), `${lessonId} needs a web language`);
    assert.ok(Array.isArray(data.puzzles) && data.puzzles.length === 1, `${lessonId} needs exactly one puzzle`);

    await serialize(content, { blockJS: false });
  }
});

test("every web puzzle has a valid config, a visible example, and a solution that is not sent to the browser", async () => {
  const seen = new Set();
  for (const lessonId of course.lessons) {
    const { data: lesson } = parseFrontmatter(await readContent("lessons", lessonId));

    for (const puzzleId of lesson.puzzles) {
      assert.ok(!seen.has(puzzleId), `${puzzleId} is used by more than one lesson`);
      seen.add(puzzleId);

      const { data: puzzle } = parseFrontmatter(await readContent("puzzles", puzzleId));
      assert.equal(puzzle.kind, "web", `${puzzleId} must be kind: web`);
      assert.ok(
        (puzzle.languages || []).some((language) => ["html", "css", "javascript"].includes(language)),
        `${puzzleId} should be marked html, css, or javascript`,
      );
      assert.equal(puzzle.available, true, `${puzzleId} must be available`);

      const config = normalizeWebConfig(puzzle.webConfig);
      assert.ok(config, `${puzzleId} has an invalid webConfig`);
      assert.ok(config.solution, `${puzzleId} needs a solution so it can be verified`);
      assert.ok(config.files.html.includes("<html"), `${puzzleId} starter must be a full HTML document`);

      const client = getClientWebInfo(puzzle.webConfig);
      assert.equal("solution" in client, false, `${puzzleId} must not expose its solution`);
      assert.equal(JSON.stringify(client).includes(config.solution.html.trim()), false, `${puzzleId} leaks its solution`);
    }
  }
  assert.equal(seen.size, course.lessons.length);
});

test("web-development taxonomy topics and languages used by the course exist", async () => {
  const taxonomy = JSON.parse(await readFile(new URL("../content/taxonomy.json", import.meta.url), "utf8"));
  const topicIds = new Set(taxonomy.topics.map((t) => t.id));
  const languageIds = new Set(taxonomy.languages.map((l) => l.id));
  for (const id of ["html", "css", "javascript"]) {
    assert.ok(topicIds.has(id), `topic ${id} missing`);
    assert.ok(languageIds.has(id), `language ${id} missing`);
  }
});
