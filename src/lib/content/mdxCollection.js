import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "@/lib/frontmatter";

export function createMdxCollection(dir, defaults = {}) {
  function readFile(fileName) {
    const id = fileName.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(dir, fileName), "utf8");
    const { data, content } = parseFrontmatter(raw);

    return {
      id,
      content,
      areas: [],
      topics: [],
      tags: [],
      languages: [],
      difficulty: "beginner",
      ...defaults,
      ...data,
    };
  }

  function getAll() {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".mdx"))
      .map(readFile)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function getById(id) {
    const fullPath = path.join(dir, `${id}.mdx`);
    if (!fs.existsSync(fullPath)) return null;
    return readFile(`${id}.mdx`);
  }

  return { getAll, getById };
}