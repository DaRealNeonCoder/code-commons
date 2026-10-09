import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "@/lib/frontmatter";
const LESSON_PATH = path.join(process.cwd(), "content/shaders/lesson.mdx");

// Only one shader lesson exists right now, so this just reads that single
// file. Mirrors getLessonById in lib/pythonLessons.js, and is the natural
// place to grow into getShaderLessonById()/getAllShaderLessons() once more
// than one exists.
export function getShaderLesson() {
  if (!fs.existsSync(LESSON_PATH)) return null;
  const raw = fs.readFileSync(LESSON_PATH, "utf8");
  const { data, content } = parseFrontmatter(raw);
  return { ...data, content };
}