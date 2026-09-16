import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const LESSONS_DIR = path.join(process.cwd(), "src/lessons");

// Recursively collects every .mdx file under `dir`, at any depth — this is
// what lets you organize lessons into subfolders (e.g. src/lessons/unit-1/,
// src/lessons/unit-2/basics/...) instead of one flat folder.
function walkMdxFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkMdxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      results.push(fullPath);
    }
  }
  return results;
}

function readLessonFile(fullPath) {
  // The id is just the filename (no folders) — so a lesson's URL
  // (/python/<id>) stays the same no matter how deep you nest the file.
  const id = path.basename(fullPath, ".mdx");
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  return { id, content, ...data };
}

export function getAllLessons() {
  const lessons = walkMdxFiles(LESSONS_DIR).map(readLessonFile);

  // Because the id ignores folder structure, two files with the same name
  // in different folders would collide. Keep the first one found and warn
  // instead of silently overwriting or crashing.
  const seen = new Map();
  for (const lesson of lessons) {
    if (seen.has(lesson.id)) {
      console.warn(
        `[pythonLessons] Duplicate lesson id "${lesson.id}" found in more than one folder — ignoring the extra copy. Rename one of the files.`
      );
      continue;
    }
    seen.set(lesson.id, lesson);
  }

  return [...seen.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getLessonById(id) {
  const match = walkMdxFiles(LESSONS_DIR).find((fullPath) => path.basename(fullPath, ".mdx") === id);
  if (!match) return null;
  return readLessonFile(match);
}