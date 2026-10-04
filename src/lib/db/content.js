import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db } from "./index";

export const LIMITS = { title: 200, summary: 500, body: 100_000 };

const UNIQUE_VIOLATION = "23505";
function isUniqueViolation(err) {
  return err?.code === UNIQUE_VIOLATION || err?.cause?.code === UNIQUE_VIOLATION;
}

export function slugify(input, fallback = "item") {
  const base = (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return base || `${fallback}-${Date.now()}`;
}

// Insert-or-update for any table with slug / ownerId / projectId columns.
// Same rules as saveDbLesson:
//  - pinnedSlug: upsert on that exact slug (imports)
//  - otherwise the slug comes from the title (-2, -3 ... on collision); with a
//    projectId, re-saving updates the same row and keeps its slug/URL
//  - updates only apply when ownerId matches
// Returns { ok: true, slug } or { ok: false, error }.
export async function upsertWithSlug(table, { values, ownerId, projectId = null, pinnedSlug = null, title, fallback }) {
  if (!ownerId) return { ok: false, error: "missing_owner" };

  if (pinnedSlug) {
    try {
      const rows = await db
        .insert(table)
        .values({ ...values, slug: pinnedSlug, ownerId, projectId })
        .onConflictDoUpdate({
          target: table.slug,
          set: { ...values, projectId, updatedAt: new Date() },
          setWhere: eq(table.ownerId, ownerId),
        })
        .returning({ slug: table.slug });
      if (rows.length === 0) return { ok: false, error: "forbidden" };
      return { ok: true, slug: rows[0].slug };
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, error: "conflict" };
      throw err;
    }
  }

  const base = slugify(title, fallback);

  for (let attempt = 0; attempt < 10; attempt++) {
    const slug =
      attempt === 0
        ? base
        : attempt < 6
          ? `${base}-${attempt + 1}`
          : `${base}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const insert = db.insert(table).values({ ...values, slug, ownerId, projectId });
      const rows = projectId
        ? await insert
            .onConflictDoUpdate({
              target: table.projectId,
              set: { ...values, updatedAt: new Date() }, // slug is never changed
              setWhere: eq(table.ownerId, ownerId),
            })
            .returning({ slug: table.slug })
        : await insert.returning({ slug: table.slug });

      if (rows.length === 0) return { ok: false, error: "forbidden" };
      return { ok: true, slug: rows[0].slug };
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  return { ok: false, error: "slug_unavailable" };
}

// A store for one of the lesson-shaped tables (puzzles, shaders, circuits, builds).
//   heavy:     payload columns left out of list/light reads (code, test cases...)
//   listExtra: extra computed columns for list reads
// Items come back shaped like the old file-based ones: { id: slug, content: body, ... }.
export function createContentStore(table, { fallback, heavy = [], listExtra = {} }) {
  const { body: _body, ...lightColumns } = getTableColumns(table);
  for (const key of heavy) delete lightColumns[key];
  const listSelect = { ...lightColumns, ...listExtra };

  function toItem(row) {
    if (!row) return null;
    const { id: _id, slug, body, order, ...rest } = row;
    const item = { ...rest, id: slug, content: body, source: "db" };
    if (order != null) item.order = order;
    return item;
  }

  return {
    async getBySlug(slug) {
      const [row] = await db.select().from(table).where(eq(table.slug, slug)).limit(1);
      return toItem(row);
    },

    async getByProjectId(projectId) {
      const [row] = await db.select().from(table).where(eq(table.projectId, projectId)).limit(1);
      return toItem(row);
    },

    // Light rows (no body, no heavy columns) for several slugs in one query.
    async getBySlugs(slugs) {
      if (!slugs.length) return [];
      const rows = await db.select(listSelect).from(table).where(inArray(table.slug, slugs));
      return rows.map(toItem);
    },

    // Light rows. ownerId is stripped so it can't leak to the browser.
    async list({ ownerId, onlyAvailable = true, limit = 1000, offset = 0 } = {}) {
      const rows = await db
        .select(listSelect)
        .from(table)
        .where(
          and(
            onlyAvailable ? eq(table.available, true) : undefined,
            ownerId ? eq(table.ownerId, ownerId) : undefined
          )
        )
        .orderBy(sql`${table.order} asc nulls last`, desc(table.createdAt))
        .limit(Math.min(limit, 1000))
        .offset(offset);
      return rows.map(toItem).map(({ ownerId: _owner, ...rest }) => rest);
    },

    async save({
      ownerId,
      projectId = null,
      slug = null,
      order = null,
      title,
      summary = "",
      body = "",
      difficulty,
      available = true,
      areas = [],
      topics = [],
      tags = [],
      languages = [],
      payload = {},
    }) {
      if (body.length > LIMITS.body) return { ok: false, error: "body_too_long" };
      const values = {
        title: title.slice(0, LIMITS.title),
        summary: summary.slice(0, LIMITS.summary),
        body,
        difficulty,
        available,
        order,
        areas,
        topics,
        tags,
        languages,
        ...payload,
      };
      return upsertWithSlug(table, { values, ownerId, projectId, pinnedSlug: slug, title, fallback });
    },

    async remove({ slug, ownerId }) {
      const rows = await db
        .delete(table)
        .where(and(eq(table.slug, slug), eq(table.ownerId, ownerId)))
        .returning({ slug: table.slug });
      return rows.length > 0;
    },
  };
}
