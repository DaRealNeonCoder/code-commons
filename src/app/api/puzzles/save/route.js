import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { loadTaxonomy, isValidSelection } from "@/lib/taxonomy";

const PUZZLES_DIR = path.join(process.cwd(), "content/puzzles");

const MAX_TEST_CASES = 50;
const MAX_TEST_FIELD_LENGTH = 10_000;

function slugify(input) {
  const base = (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `puzzle-${Date.now()}`;
}

function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (fs.existsSync(path.join(PUZZLES_DIR, `${slug}.mdx`))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

// Returns a clean array, or null if the payload is malformed.
// Test cases are optional: a missing/empty list means "no Submit button".
function parseTestCases(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_TEST_CASES) return null;

  const cases = [];
  for (const t of value) {
    if (
      typeof t?.input !== "string" ||
      typeof t?.expected !== "string" ||
      !t.expected.trim() ||
      t.input.length > MAX_TEST_FIELD_LENGTH ||
      t.expected.length > MAX_TEST_FIELD_LENGTH
    ) {
      return null;
    }
    cases.push({ input: t.input, expected: t.expected, hidden: Boolean(t.hidden) });
  }
  return cases;
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
    return Response.json({ error: "A puzzle title is required." }, { status: 400 });
  }
  if (typeof body.content !== "string" || body.content.trim() === "") {
    return Response.json({ error: "Add at least one text block." }, { status: 400 });
  }
  if (!body.difficulty || typeof body.difficulty !== "string") {
    return Response.json({ error: "Pick a difficulty." }, { status: 400 });
  }

  const testCases = parseTestCases(body.testCases);
  if (testCases === null) {
    return Response.json(
      { error: `Each test case needs an expected output (max ${MAX_TEST_CASES} cases).` },
      { status: 400 }
    );
  }

  const selection = {
    areas: asArray(body.areas),
    topics: asArray(body.topics),
    tags: asArray(body.tags),
    languages: asArray(body.languages),
    difficulty: body.difficulty,
  };

  // Defense in depth: the Create page only ever offers taxonomy checkboxes,
  // but this rejects anything not in the controlled vocabulary even if the
  // API is called directly, bypassing the UI. Same pattern as /api/lessons.
  const taxonomy = loadTaxonomy();
  if (!isValidSelection(taxonomy, selection)) {
    return Response.json({ error: "One or more areas/topics/tags/language/difficulty is not recognized." }, { status: 400 });
  }

  fs.mkdirSync(PUZZLES_DIR, { recursive: true });

  // NOTE: previously nested under content/puzzles/{category}/{slug}.mdx with
  // category as one of a fixed set (algorithms/data-management/hacking).
  // Category is gone in favor of the areas/topics/tags taxonomy, so this now
  // stores flat, matching lessons/shaders/circuits. If a route renders
  // /puzzles/[category]/[id], it'll need updating (or existing puzzle .mdx
  // files moved) to match — that route wasn't part of what I was given.
  const slug = uniqueSlug(slugify(body.title));
  const fullPath = path.join(PUZZLES_DIR, `${slug}.mdx`);

  if (!fullPath.startsWith(PUZZLES_DIR + path.sep)) {
    return Response.json({ error: "Invalid puzzle name." }, { status: 400 });
  }

  const frontmatter = {
    title: body.title,
    available: true,
    starterCode: typeof body.starterCode === "string" ? body.starterCode : "",
    areas: selection.areas,
    topics: selection.topics,
    tags: selection.tags,
    languages: selection.languages,
    difficulty: selection.difficulty,
  };
  if (testCases.length > 0) frontmatter.testCases = testCases;

  fs.writeFileSync(fullPath, matter.stringify(body.content, frontmatter), "utf8");

  return Response.json({ id: slug });
}