import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

// Deliberately a separate file from data/auth.db — this table is ours, not
// Better Auth's, so it's not touched by `npx auth migrate`.
const db = new Database(path.join(DATA_DIR, "progress.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS completions (
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, item_type, item_id)
  );
`);

const upsertStmt = db.prepare(`
  INSERT INTO completions (user_id, item_type, item_id, completed_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET completed_at = excluded.completed_at
`);

const deleteStmt = db.prepare(
  "DELETE FROM completions WHERE user_id = ? AND item_type = ? AND item_id = ?"
);

const checkStmt = db.prepare(
  "SELECT 1 FROM completions WHERE user_id = ? AND item_type = ? AND item_id = ?"
);

export function markComplete(userId, itemType, itemId) {
  upsertStmt.run(userId, itemType, itemId, new Date().toISOString());
}

export function unmarkComplete(userId, itemType, itemId) {
  deleteStmt.run(userId, itemType, itemId);
}

export function isComplete(userId, itemType, itemId) {
  if (!userId) return false;
  return Boolean(checkStmt.get(userId, itemType, itemId));
}
