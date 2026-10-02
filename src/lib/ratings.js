import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

// Everything that can be rated. Courses and lessons are separate namespaces,
// so a course's rating never leaks into the lessons inside it.
export const RATING_TYPES = ["course", "lesson", "puzzle", "shader", "circuit", "project"];

export function isRatingType(value) {
  return RATING_TYPES.includes(value);
}

function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "ratings.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      user_id    TEXT NOT NULL,
      item_type  TEXT NOT NULL,
      item_id    TEXT NOT NULL,
      value      INTEGER NOT NULL CHECK (value IN (-1, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, item_type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ratings_item ON ratings (item_type, item_id);
  `);
  return db;
}

// Cache on globalThis so dev-server hot reloads don't open a new connection each time.
const db = globalThis.__ratingsDb ?? (globalThis.__ratingsDb = openDb());

const keyOf = (type, id) => `${type}:${id}`;

// { likes, dislikes, userVote } for one item. userVote is 1, -1, or 0 (no vote / signed out).
export function getRatingSummary(itemType, itemId, userId = null) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(value = 1), 0)  AS likes,
              COALESCE(SUM(value = -1), 0) AS dislikes
       FROM ratings
       WHERE item_type = ? AND item_id = ?`
    )
    .get(itemType, itemId);

  let userVote = 0;
  if (userId) {
    const mine = db
      .prepare("SELECT value FROM ratings WHERE user_id = ? AND item_type = ? AND item_id = ?")
      .get(userId, itemType, itemId);
    userVote = mine?.value ?? 0;
  }

  return { likes: row.likes, dislikes: row.dislikes, userVote };
}

// value: 1 = like, -1 = dislike, 0 = remove my vote. Returns the fresh summary.
export function setVote(userId, itemType, itemId, value) {
  if (value === 0) {
    db.prepare("DELETE FROM ratings WHERE user_id = ? AND item_type = ? AND item_id = ?").run(
      userId,
      itemType,
      itemId
    );
  } else {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO ratings (user_id, item_type, item_id, value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, item_type, item_id)
       DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(userId, itemType, itemId, value, now, now);
  }
  return getRatingSummary(itemType, itemId, userId);
}

// Map of "type:id" -> { likes, dislikes } for every rated item. One query, used by search.
export function getRatingTotals() {
  const rows = db
    .prepare(
      `SELECT item_type, item_id,
              SUM(value = 1)  AS likes,
              SUM(value = -1) AS dislikes
       FROM ratings
       GROUP BY item_type, item_id`
    )
    .all();
  return new Map(rows.map((r) => [keyOf(r.item_type, r.item_id), { likes: r.likes, dislikes: r.dislikes }]));
}

// Map of "type:id" -> 1 | -1 for everything this user has voted on.
export function getUserVotes(userId) {
  if (!userId) return new Map();
  const rows = db
    .prepare("SELECT item_type, item_id, value FROM ratings WHERE user_id = ?")
    .all(userId);
  return new Map(rows.map((r) => [keyOf(r.item_type, r.item_id), r.value]));
}

// Lower bound of the 95% Wilson confidence interval for the like ratio.
// Ranks 90 likes / 10 dislikes above 1 like / 0 dislikes, which a plain
// percentage would get backwards. Range 0..1; unrated items score 0.
export function wilsonScore(likes, dislikes) {
  const n = likes + dislikes;
  if (n === 0) return 0;
  const z = 1.96;
  const p = likes / n;
  return (
    (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}