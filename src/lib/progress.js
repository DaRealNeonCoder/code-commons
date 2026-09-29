import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "progress.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS progress (
      user_id      TEXT NOT NULL,
      item_type    TEXT NOT NULL,
      item_id      TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, item_type, item_id)
    )
  `);
  return db;
}

// Cache on globalThis so dev-server hot reloads don't open a new connection each time.
const db = globalThis.__progressDb ?? (globalThis.__progressDb = openDb());

export function isCompleted(userId, itemType, itemId) {
  const row = db
    .prepare("SELECT 1 FROM progress WHERE user_id = ? AND item_type = ? AND item_id = ?")
    .get(userId, itemType, itemId);
  return Boolean(row);
}

export function setCompleted(userId, itemType, itemId, completed) {
  if (completed) {
    // Idempotent: re-completing keeps the original completed_at.
    db.prepare(
      "INSERT OR IGNORE INTO progress (user_id, item_type, item_id) VALUES (?, ?, ?)"
    ).run(userId, itemType, itemId);
  } else {
    db.prepare(
      "DELETE FROM progress WHERE user_id = ? AND item_type = ? AND item_id = ?"
    ).run(userId, itemType, itemId);
  }
}

export function getCompletedIds(userId, itemType) {
  return db
    .prepare("SELECT item_id FROM progress WHERE user_id = ? AND item_type = ?")
    .all(userId, itemType)
    .map((row) => row.item_id);
}