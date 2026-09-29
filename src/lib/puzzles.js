import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PUZZLES_DIR = path.join(process.cwd(), "content/puzzles");

// Frontmatter shape: testCases: [{ input: "10", expected: "55", hidden: false }]
// Hand-written YAML like `expected: 55` parses as a number, so coerce to strings.
function normalizeTestCases(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((t) => t && t.expected !== undefined && t.expected !== null)
    .map((t) => ({
      input: String(t.input ?? ""),
      expected: String(t.expected),
      hidden: Boolean(t.hidden),
    }));
}

function readPuzzleFile(fileName) {
  const id = fileName.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(PUZZLES_DIR, fileName), "utf8");
  const { data, content } = matter(raw);
  return {
    id,
    content,
    areas: [],
    topics: [],
    tags: [],
    languages: [],
    difficulty: "beginner",
    ...data,
    testCases: normalizeTestCases(data.testCases),
  };
}

// The list view never needs test data, so strip it here. That way a listing
// page can't accidentally pass hidden test answers to a client component.
export function getAllPuzzles() {
  return fs
    .readdirSync(PUZZLES_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map(readPuzzleFile)
    .map(({ testCases, ...puzzle }) => ({ ...puzzle, hasTests: testCases.length > 0 }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Full puzzle including ALL test cases. Server-only: use it in the check
// route, and use getClientTestInfo() before handing anything to the browser.
export function getPuzzleById(id) {
  const fullPath = path.join(PUZZLES_DIR, `${id}.mdx`);
  if (!fs.existsSync(fullPath)) return null;
  return readPuzzleFile(`${id}.mdx`);
}

// The only test data that is safe to send to the browser: visible cases
// (input + expected) and a count of hidden ones.
export function getClientTestInfo(puzzle) {
  const sampleTests = puzzle.testCases
    .filter((t) => !t.hidden)
    .map(({ input, expected }) => ({ input, expected }));
  return {
    checkable: puzzle.testCases.length > 0,
    sampleTests,
    hiddenTestCount: puzzle.testCases.length - sampleTests.length,
  };
}