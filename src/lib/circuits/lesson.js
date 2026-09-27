import fs from "node:fs";
import path from "node:path";

const LESSONS_DIR = path.join(process.cwd(), "content", "circuits", "lessons");
const CURRENT_LESSON = "nand-gates";

export function getCircuitLesson(slug = CURRENT_LESSON) {
  try {
    const raw = fs.readFileSync(path.join(LESSONS_DIR, `${slug}.mdx`), "utf8");
    return { slug, ...parseFrontmatter(raw) };
  } catch {
    return null;
  }
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { title: undefined, content: raw };
  const [, frontmatter, body] = match;
  const title = frontmatter
    .match(/^title:\s*(.+)$/m)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "");
  return { title, content: body };
}