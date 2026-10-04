import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Everything (auth tables included) is exported from here, because this is the
// file drizzle-kit and the db client read.
export * from "./auth-schema";

const emptyTextArray = sql`'{}'::text[]`;

// ---------- lessons ----------

// User-created lessons. Mirrors the frontmatter of content/lessons/*.mdx:
//   title, summary, available, projectId, puzzles, areas, topics, tags,
//   languages, difficulty  (+ the MDX body)
// `order` is nullable: only imported official lessons set it. User lessons leave
// it null and sort by createdAt (manual ordering races under concurrent users).
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // URL slug. Unique across all user lessons; the helpers also keep it from
    // colliding with official (file-based) lesson slugs.
    slug: text("slug").notNull().unique(),

    // No foreign key on purpose: imported official lessons are owned by the
    // string "system", which isn't a row in the user table.
    ownerId: text("owner_id").notNull(),

    // The creator project this lesson was published from. Unique, so
    // re-publishing the same project updates the same lesson.
    projectId: text("project_id").unique(),

    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    // MDX source WITHOUT the frontmatter block (frontmatter lives in the columns
    // around it). Only ever fill this from your server-side assembler/importer.
    body: text("body").notNull(),
    difficulty: text("difficulty").notNull(),
    available: boolean("available").notNull().default(true),
    order: integer("sort_order"), // null for user lessons

    // Ordered list of puzzle ids this lesson links to.
    puzzles: text("puzzles").array().notNull().default(emptyTextArray),

    // Taxonomy selections (validated against your taxonomy in git).
    areas: text("areas").array().notNull().default(emptyTextArray),
    topics: text("topics").array().notNull().default(emptyTextArray),
    tags: text("tags").array().notNull().default(emptyTextArray),
    languages: text("languages").array().notNull().default(emptyTextArray),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lessons_owner_idx").on(t.ownerId),
    index("lessons_created_idx").on(t.createdAt),
    index("lessons_difficulty_idx").on(t.difficulty),
    // GIN indexes make "contains" filters on the arrays fast.
    index("lessons_areas_idx").using("gin", t.areas),
    index("lessons_topics_idx").using("gin", t.topics),
    index("lessons_tags_idx").using("gin", t.tags),
    index("lessons_languages_idx").using("gin", t.languages),
  ]
);

// ---------- creator projects (drafts) ----------

export const creatorProjects = pgTable(
  "creator_projects",
  {
    id: text("id").primaryKey(), // randomUUID(), generated in lib/creatorProjects.js
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull().default(""),
    data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("creator_projects_user_idx").on(t.userId, t.updatedAt),
    index("creator_projects_type_idx").on(t.type),
  ]
);

// ---------- ratings ----------

export const ratings = pgTable(
  "ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    value: smallint("value").notNull(), // 1 = like, -1 = dislike
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemType, t.itemId] }),
    index("ratings_item_idx").on(t.itemType, t.itemId),
    check("ratings_value_check", sql`${t.value} in (-1, 1)`),
  ]
);

// ---------- progress ----------

export const progress = pgTable(
  "progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemType, t.itemId] })]
);

// ---------- media ----------

// Metadata for uploaded images. The file itself lives in object storage
// (Vercel Blob); lessons just reference the URL.
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    url: text("url").notNull().unique(),
    pathname: text("pathname").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_owner_idx").on(t.ownerId)]
);
