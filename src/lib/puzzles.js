import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PUZZLES_DIR = path.join(process.cwd(), "src/puzzles");

// Categories are just a short, hand-maintained list — they're groupings, not
// content, so they don't need their own files the way lessons/puzzles do.
export const puzzleCategories = [
  {
    id: "algorithms",
    title: "Algorithms",
    tagline: "Classic problem solving, one function at a time.",
    available: true,
  },
  {
    id: "data-management",
    title: "Data Management",
    tagline: "Wrangle lists, dictionaries, and files.",
    available: false,
  },
  {
    id: "hacking",
    title: "Hacking",
    tagline: "Break ciphers, exploit bugs, capture the flag.",
    available: false,
  },
];

export function getCategoryById(id) {
  return puzzleCategories.find((category) => category.id === id) || null;
}

function readPuzzleFile(categoryId, fileName) {
  const id = fileName.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(PUZZLES_DIR, categoryId, fileName), "utf8");
  const { data, content } = matter(raw);
  return { id, content, ...data };
}

export function getPuzzlesForCategory(categoryId) {
  const dir = path.join(PUZZLES_DIR, categoryId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => readPuzzleFile(categoryId, file));
}

export function getPuzzle(categoryId, puzzleId) {
  const fullPath = path.join(PUZZLES_DIR, categoryId, `${puzzleId}.mdx`);
  if (!fs.existsSync(fullPath)) return null;
  return readPuzzleFile(categoryId, `${puzzleId}.mdx`);
}