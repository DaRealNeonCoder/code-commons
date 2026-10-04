import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { creatorProjects } from "./db/schema";

// Same function names as the SQLite version, but every one is async now.

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// Dashboard list: no `data` blob, just what the cards need.
export async function listProjects(userId) {
  const rows = await db
    .select({
      id: creatorProjects.id,
      type: creatorProjects.type,
      title: creatorProjects.title,
      createdAt: creatorProjects.createdAt,
      updatedAt: creatorProjects.updatedAt,
    })
    .from(creatorProjects)
    .where(eq(creatorProjects.userId, userId))
    .orderBy(desc(creatorProjects.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getProject(id) {
  if (typeof id !== "string" || !id) return null;
  const [row] = await db.select().from(creatorProjects).where(eq(creatorProjects.id, id)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    data: plainObject(row.data),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createProject(userId, type) {
  const id = randomUUID();
  await db.insert(creatorProjects).values({ id, userId, type });
  return id;
}

// `data` is a plain object (stored as jsonb).
// Returns false when the project doesn't exist or belongs to someone else.
export async function updateProject(id, userId, { title, data }) {
  const rows = await db
    .update(creatorProjects)
    .set({ title: title.slice(0, 200), data, updatedAt: new Date() })
    .where(and(eq(creatorProjects.id, id), eq(creatorProjects.userId, userId)))
    .returning({ id: creatorProjects.id });
  return rows.length > 0;
}

export async function deleteProject(id, userId) {
  const rows = await db
    .delete(creatorProjects)
    .where(and(eq(creatorProjects.id, id), eq(creatorProjects.userId, userId)))
    .returning({ id: creatorProjects.id });
  return rows.length > 0;
}

// Every project of one type, across all users. Used to build the public search index.
export async function listProjectsByType(type) {
  const rows = await db
    .select({
      id: creatorProjects.id,
      userId: creatorProjects.userId,
      title: creatorProjects.title,
      data: creatorProjects.data,
    })
    .from(creatorProjects)
    .where(eq(creatorProjects.type, type))
    .orderBy(desc(creatorProjects.updatedAt));

  return rows.map((row) => ({ ...row, data: plainObject(row.data) }));
}
