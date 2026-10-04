import { cache } from "react";
import { getAllLessons as getFileLessons, getLessonById as getFileLesson } from "./lessons";
import {
  getDbLessonBySlug,
  getDbLessonByProjectId,
  getDbLessonsBySlugs,
  listDbLessons,
} from "./db/lessons";

// One place to read lessons from BOTH sources:
//   - official lessons: content/lessons/*.mdx (files, in git)
//   - user lessons: the lessons table (Neon)
//
// Both come back in the same shape, tagged with `source: "file" | "db"`.
// Official lessons win if an id ever exists in both. The DB owner id is
// stripped here, so nothing downstream can leak it to the browser.
//
// Everything is async. Names differ from lib/lessons.js on purpose, so a
// missed import is easy to grep for:
//   getLessons / getLesson / getLessonsByIds / getLessonByProjectId

// Lesson ids end up in file paths, so only safe slugs get as far as the filesystem.
const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

const fromFile = (lesson) => ({ ...lesson, source: "file" });
const fromDb = ({ ownerId, ...rest }) => rest;

// Every lesson, official first (by `order`), then user lessons (newest first).
// DB lessons come WITHOUT `content` here, since lists don't need bodies;
// use getLesson(id) when you need the text.
export async function getLessons() {
  const files = getFileLessons().map(fromFile);
  const fileIds = new Set(files.map((l) => l.id));

  const rows = await listDbLessons({ onlyAvailable: false, includeBody: false, limit: 1000 });
  return [...files, ...rows.filter((l) => !fileIds.has(l.id)).map(fromDb)];
}

// One lesson with its content, or null. Cached per request, so the lesson page
// and getCourseContext asking for the same id costs one lookup.
export const getLesson = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;

  const file = getFileLesson(id);
  if (file) return fromFile(file);

  const row = await getDbLessonBySlug(id);
  return row ? fromDb(row) : null;
});

// Many lessons at once (no DB bodies) -> Map(id -> lesson). Missing ids are
// simply absent. One DB query total, however many ids.
export async function getLessonsByIds(ids) {
  const found = new Map();
  const wantFromDb = new Set();

  for (const id of ids) {
    if (typeof id !== "string" || !SLUG.test(id) || found.has(id)) continue;
    const file = getFileLesson(id);
    if (file) found.set(id, fromFile(file));
    else wantFromDb.add(id);
  }

  if (wantFromDb.size > 0) {
    for (const row of await getDbLessonsBySlugs([...wantFromDb])) found.set(row.id, fromDb(row));
  }
  return found;
}

// The ids that are malformed or don't match any lesson.
export async function findMissingLessonIds(ids) {
  const found = await getLessonsByIds(ids);
  return ids.filter((id) => !found.has(id));
}

// The lesson a creator project was published as, if any.
export async function getLessonByProjectId(projectId) {
  if (typeof projectId !== "string" || !projectId) return null;

  const file = getFileLessons().find((l) => l.projectId === projectId);
  if (file) return fromFile(file);

  const row = await getDbLessonByProjectId(projectId);
  return row ? fromDb(row) : null;
}

// Ids of official lessons. Pass to saveLessonMdx as `reservedSlugs` so a user
// lesson can never take an official lesson's URL.
export function getOfficialLessonIds() {
  return new Set(getFileLessons().map((l) => l.id));
}
