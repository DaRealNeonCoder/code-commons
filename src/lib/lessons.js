import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const LESSONS_DIR = path.join(process.cwd(), "content/lessons");

function readLessonFile(fileName) {
  const id = fileName.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(LESSONS_DIR, fileName), "utf8");
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
  };
}

export function getAllLessons() {
  return fs
    .readdirSync(LESSONS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map(readLessonFile)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getLessonById(id) {
  const fullPath = path.join(LESSONS_DIR, `${id}.mdx`);
  if (!fs.existsSync(fullPath)) return null;
  return readLessonFile(`${id}.mdx`);
}
