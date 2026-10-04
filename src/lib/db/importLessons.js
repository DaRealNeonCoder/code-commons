import fs from "node:fs";
import path from "node:path";
import { SYSTEM_OWNER } from "./lessons";
import { saveLessonMdx } from "./lessonMdx";

// Copy .mdx files from disk into the DB. Meant for one-off scripts (seeding or
// migrating content/lessons), not for request handlers: it reads the local
// filesystem.
//
// The file name becomes the slug, so URLs stay the same, and re-running is
// safe: it updates the existing row instead of creating a duplicate.

export async function importLessonFile(filePath, { ownerId = SYSTEM_OWNER, keepSlug = true } = {}) {
  const file = path.basename(filePath);
  const raw = fs.readFileSync(filePath, "utf8");
  const slug = keepSlug ? file.replace(/\.mdx$/, "") : undefined;

  const result = await saveLessonMdx(raw, { ownerId, slug });
  return { file, ...result };
}

export async function importLessonsDir(
  dir = path.join(process.cwd(), "content/lessons"),
  options = {}
) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).sort();

  const results = [];
  for (const f of files) {
    results.push(await importLessonFile(path.join(dir, f), options));
  }
  return results; // [{ file, ok, slug } | { file, ok: false, error }]
}
