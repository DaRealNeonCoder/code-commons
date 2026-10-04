import { and, arrayContains, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { db } from "./index";
import { lessons } from "./schema";

export const LIMITS = {
  title: 200,
  summary: 500,
  body: 100_000,
};

// Owner id used for official lessons imported from content/lessons/*.mdx.
export const SYSTEM_OWNER = "system";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err) {
  return err?.code === UNIQUE_VIOLATION || err?.cause?.code === UNIQUE_VIOLATION;
}

export function slugify(input) {
  const base = (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return base || `lesson-${Date.now()}`;
}

// Shape a DB row like the objects getAllLessons()/getLessonById() return for
// .mdx files, so pages and cards can treat both sources the same.
// `content` (the MDX body) is only present when the body was selected.
export function toLesson(row) {
  if (!row) return null;
  const lesson = {
    id: row.slug,
    title: row.title,
    summary: row.summary,
    available: row.available,
    projectId: row.projectId,
    puzzles: row.puzzles,
    areas: row.areas,
    topics: row.topics,
    tags: row.tags,
    languages: row.languages,
    difficulty: row.difficulty,
    content: row.body,
    source: "db",
    ownerId: row.ownerId, // server-side only: strip before sending to the browser
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.order != null) lesson.order = row.order; // omit when null, like a file without `order`
  return lesson;
}

// ---------- reads ----------

// Mirror of getLessonById(id): the id is the slug. Returns null if missing.
export async function getDbLessonBySlug(slug) {
  const [row] = await db.select().from(lessons).where(eq(lessons.slug, slug)).limit(1);
  return toLesson(row);
}

export async function getDbLessonByProjectId(projectId) {
  const [row] = await db.select().from(lessons).where(eq(lessons.projectId, projectId)).limit(1);
  return toLesson(row);
}

// Several lessons by slug in one query (no bodies). Used to load a course's
// lessons without one query per lesson.
export async function getDbLessonsBySlugs(slugs) {
  if (!slugs.length) return [];
  const { body, ...listColumns } = getTableColumns(lessons);
  const rows = await db.select(listColumns).from(lessons).where(inArray(lessons.slug, slugs));
  return rows.map(toLesson);
}

// Filters are all optional. Array filters match lessons that contain the value.
//   listDbLessons({ area: "programming-fundamentals", language: "python" })
// Bodies are skipped by default (lists don't need them); pass includeBody: true
// to get the same shape as getAllLessons().
export async function listDbLessons({
  area,
  topic,
  tag,
  language,
  difficulty,
  ownerId,
  onlyAvailable = true,
  includeBody = false,
  limit = 50,
  offset = 0,
} = {}) {
  const { body, ...listColumns } = getTableColumns(lessons);

  const conditions = [
    onlyAvailable ? eq(lessons.available, true) : undefined,
    area ? arrayContains(lessons.areas, [area]) : undefined,
    topic ? arrayContains(lessons.topics, [topic]) : undefined,
    tag ? arrayContains(lessons.tags, [tag]) : undefined,
    language ? arrayContains(lessons.languages, [language]) : undefined,
    difficulty ? eq(lessons.difficulty, difficulty) : undefined,
    ownerId ? eq(lessons.ownerId, ownerId) : undefined,
  ];

  const rows = await db
    .select(includeBody ? undefined : listColumns)
    .from(lessons)
    .where(and(...conditions)) // undefined entries are ignored
    .orderBy(desc(lessons.createdAt))
    .limit(Math.min(limit, 1000))
    .offset(offset);

  return rows.map(toLesson);
}

// ---------- writes ----------

// Create or update a lesson from already-parsed values. (saveLessonMdx in
// lessonMdx.js is the usual entry point: it parses an MDX string and calls this.)
//
// - Default: slug is derived from the title (-2, -3, ... on collision). With a
//   projectId, re-saving updates the same lesson and keeps its slug/URL.
// - `slug` given: that exact slug is used and re-saving updates it. This is
//   for importing official lessons whose slug is the file name.
// - Updates only apply if ownerId matches, so nobody can overwrite a lesson
//   that belongs to someone else.
// - reservedSlugs: slugs of official file-based lessons, so user lessons can't
//   shadow them, e.g. new Set(getAllLessons().map((l) => l.id)).
//
// Returns { ok: true, slug } or { ok: false, error }.
export async function saveDbLesson(
  {
    ownerId,
    projectId = null,
    slug: pinnedSlug = null,
    order = null,
    title,
    summary = "",
    body,
    difficulty,
    available = true,
    puzzles = [],
    areas = [],
    topics = [],
    tags = [],
    languages = [],
  },
  { reservedSlugs = new Set() } = {}
) {
  if (!ownerId) return { ok: false, error: "missing_owner" };
  if (body.length > LIMITS.body) return { ok: false, error: "body_too_long" };

  const values = {
    title: title.slice(0, LIMITS.title),
    summary: summary.slice(0, LIMITS.summary),
    body,
    difficulty,
    available,
    order,
    puzzles,
    areas,
    topics,
    tags,
    languages,
  };

  // Pinned slug: upsert on slug.
  if (pinnedSlug) {
    try {
      const rows = await db
        .insert(lessons)
        .values({ ...values, slug: pinnedSlug, ownerId, projectId })
        .onConflictDoUpdate({
          target: lessons.slug,
          set: { ...values, projectId, updatedAt: new Date() },
          setWhere: eq(lessons.ownerId, ownerId),
        })
        .returning({ slug: lessons.slug });

      if (rows.length === 0) return { ok: false, error: "forbidden" };
      return { ok: true, slug: rows[0].slug };
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, error: "conflict" }; // e.g. projectId already used
      throw err;
    }
  }

  const base = slugify(title);

  // The unique constraint on `slug` is the source of truth. On a collision we
  // just try the next candidate, which is safe under concurrent saves.
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug =
      attempt === 0
        ? base
        : attempt < 6
          ? `${base}-${attempt + 1}`
          : `${base}-${Math.random().toString(36).slice(2, 6)}`;

    if (reservedSlugs.has(slug)) continue;

    try {
      const insert = db.insert(lessons).values({ ...values, slug, ownerId, projectId });

      const rows = projectId
        ? await insert
            .onConflictDoUpdate({
              target: lessons.projectId,
              set: { ...values, updatedAt: new Date() }, // slug is never changed
              setWhere: eq(lessons.ownerId, ownerId),
            })
            .returning({ slug: lessons.slug })
        : await insert.returning({ slug: lessons.slug });

      // Conflict on projectId, but the existing row belongs to someone else.
      if (rows.length === 0) return { ok: false, error: "forbidden" };

      return { ok: true, slug: rows[0].slug };
    } catch (err) {
      if (isUniqueViolation(err)) continue; // slug taken, try the next one
      throw err;
    }
  }

  return { ok: false, error: "slug_unavailable" };
}

// Owner-only delete. Returns true if a row was removed.
export async function deleteDbLesson({ slug, ownerId }) {
  const rows = await db
    .delete(lessons)
    .where(and(eq(lessons.slug, slug), eq(lessons.ownerId, ownerId)))
    .returning({ id: lessons.id });
  return rows.length > 0;
}
