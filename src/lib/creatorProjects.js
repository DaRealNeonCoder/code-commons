import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");

function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "creator.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_projects (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      title      TEXT NOT NULL DEFAULT '',
      data       TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creator_projects_user
      ON creator_projects (user_id, updated_at DESC);
  `);
  return db;
}

// Cache on globalThis so dev-server hot reloads don't open a new connection each time.
const db = globalThis.__creatorDb ?? (globalThis.__creatorDb = openDb());

function parseData(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

// Dashboard list: no `data` blob, just what the cards need.
export function listProjects(userId) {
  return db
    .prepare(
      `SELECT id, type, title, created_at, updated_at
       FROM creator_projects
       WHERE user_id = ?
       ORDER BY updated_at DESC`
    )
    .all(userId)
    .map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
}

export function getProject(id) {
  const row = db.prepare("SELECT * FROM creator_projects WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    data: parseData(row.data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProject(userId, type) {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO creator_projects (id, user_id, type, title, data, created_at, updated_at)
     VALUES (?, ?, ?, '', '{}', ?, ?)`
  ).run(id, userId, type, now, now);
  return id;
}

// Returns false when the project doesn't exist or belongs to someone else.
export function updateProject(id, userId, { title, dataJson }) {
  const result = db
    .prepare(
      `UPDATE creator_projects
       SET title = ?, data = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(title.slice(0, 200), dataJson, new Date().toISOString(), id, userId);
  return result.changes > 0;
}

export function deleteProject(id, userId) {
  const result = db
    .prepare("DELETE FROM creator_projects WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return result.changes > 0;
}

// Every project of one type, across all users. Used to build the public search index.
export function listProjectsByType(type) {
  return db
    .prepare(
      `SELECT id, user_id, title, data
       FROM creator_projects
       WHERE type = ?
       ORDER BY updated_at DESC`
    )
    .all(type)
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      data: parseData(row.data),
    }));
}