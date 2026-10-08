import { cache } from "react";
import {
  SYSTEM_OWNER,
  getDbLessonBySlug,
  getDbLessonByProjectId,
  getDbLessonsBySlugs,
  listDbLessons,
} from "./db/lessons";

// Single place to read lessons. Everything comes from the lessons table.
// Official lessons are rows owned by SYSTEM_OWNER (imported from content/lessons
// by scripts/seed-lessons.mjs); user lessons are everything else.
// ownerId is stripped here so it never reaches the browser.

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

const toPublic = ({ ownerId, ...rest }) => ({
  ...rest,
  official: ownerId === SYSTEM_OWNER,
});

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

// Official lessons first (by `order`), then user lessons (newest first).
// No bodies here; use getLesson(id) when you need the text.
export async function getLessons() {
  const rows = await listDbLessons({ onlyAvailable: false, includeBody: false, limit: 1000 });
  const official = rows.filter((l) => l.ownerId === SYSTEM_OWNER).sort(byOrder);
  const user = rows.filter((l) => l.ownerId !== SYSTEM_OWNER);
  return [...official, ...user].map(toPublic);
}

// One lesson with its content, or null. Cached per request.
export const getLesson = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;
  const row = await getDbLessonBySlug(id);
  return row ? toPublic(row) : null;
});

// Many lessons at once (no bodies) -> Map(id -> lesson). Missing ids are absent.
export async function getLessonsByIds(ids) {
  const valid = [...new Set(ids.filter((id) => typeof id === "string" && SLUG.test(id)))];
  const rows = await getDbLessonsBySlugs(valid);
  return new Map(rows.map((row) => [row.id, toPublic(row)]));
}

// The ids that are malformed or don't match any lesson.
export async function findMissingLessonIds(ids) {
  const found = await getLessonsByIds(ids);
  return ids.filter((id) => !found.has(id));
}

// The lesson a creator project was published as, if any.
export async function getLessonByProjectId(projectId) {
  if (typeof projectId !== "string" || !projectId) return null;
  const row = await getDbLessonByProjectId(projectId);
  return row ? toPublic(row) : null;
}

// Kept so existing call sites don't crash. Official lessons now live in the
// table, and the unique constraint on `slug` already stops a user lesson from
// taking an official URL, so there's nothing to reserve. Remove the call sites
// when convenient.
export function getOfficialLessonIds() {
  return new Set();
}