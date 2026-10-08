import { cache } from "react";
import { getDbLessonBySlug, getDbLessonsBySlugs, listDbLessons } from "./db/lessons";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

// ownerId never leaves the lib layer.
const publicLesson = (lesson) => {
  if (!lesson) return null;
  const { ownerId, ...rest } = lesson;
  return rest;
};

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

// Same job as the old fs version. listDbLessons orders by createdAt, so sort
// by `order` here (stable, so ties keep newest first). Bodies are skipped by
// default; pass { includeBody: true } if a caller needs `content` from the list.
// Filters pass straight through: getAllLessons({ language: "python" }).
export async function getAllLessons(options = {}) {
  const lessons = await listDbLessons({ limit: 1000, ...options });
  return lessons.map(publicLesson).sort(byOrder);
}

export const getLessonById = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;
  return publicLesson(await getDbLessonBySlug(id));
});

// For a course page: one query, returned in the course's order. Missing ids are dropped.
export async function getLessonsByIds(ids) {
  const valid = ids.filter((id) => typeof id === "string" && SLUG.test(id));
  const found = await getDbLessonsBySlugs(valid);
  const byId = new Map(found.map((lesson) => [lesson.id, lesson]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map(publicLesson);
}