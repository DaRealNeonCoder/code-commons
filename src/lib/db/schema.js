import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Everything (auth tables included) is exported from here, because this is the
// file drizzle-kit and the db client read.
export * from "./auth-schema";

const emptyTextArray = sql`'{}'::text[]`;

// ---------- lessons ----------

// User-created lessons. Mirrors the frontmatter of content/lessons/*.mdx.
// `order` is nullable: only imported official lessons set it.
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    // No foreign key on purpose: imported official lessons are owned by "system".
    ownerId: text("owner_id").notNull(),
    // The creator project this lesson was published from. Unique, so
    // re-publishing the same project updates the same lesson.
    projectId: text("project_id").unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull(),
    difficulty: text("difficulty").notNull(),
    available: boolean("available").notNull().default(true),
    order: integer("sort_order"),
    puzzles: text("puzzles").array().notNull().default(emptyTextArray),
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
    index("lessons_areas_idx").using("gin", t.areas),
    index("lessons_topics_idx").using("gin", t.topics),
    index("lessons_tags_idx").using("gin", t.tags),
    index("lessons_languages_idx").using("gin", t.languages),
  ]
);

// ---------- puzzles / shaders / circuits / builds ----------
// All four share the lesson-style description columns (title, summary, markdown
// body, taxonomy) and add their own payload columns.

const contentColumns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull(), // "system" for imported official content
  projectId: text("project_id").unique(), // creator project it was published from
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull().default(""), // MDX without frontmatter
  difficulty: text("difficulty").notNull(),
  available: boolean("available").notNull().default(true),
  order: integer("sort_order"),
  areas: text("areas").array().notNull().default(emptyTextArray),
  topics: text("topics").array().notNull().default(emptyTextArray),
  tags: text("tags").array().notNull().default(emptyTextArray),
  languages: text("languages").array().notNull().default(emptyTextArray),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const contentIndexes = (name, t) => [
  index(`${name}_owner_idx`).on(t.ownerId),
  index(`${name}_created_idx`).on(t.createdAt),
  index(`${name}_difficulty_idx`).on(t.difficulty),
  index(`${name}_areas_idx`).using("gin", t.areas),
  index(`${name}_topics_idx`).using("gin", t.topics),
  index(`${name}_tags_idx`).using("gin", t.tags),
  index(`${name}_languages_idx`).using("gin", t.languages),
];

export const puzzles = pgTable(
  "puzzles",
  {
    ...contentColumns(),
    starterCode: text("starter_code").notNull().default(""),
    // [{ input, expected, hidden }]. SERVER ONLY: never select this for client props.
    testCases: jsonb("test_cases").notNull().default(sql`'[]'::jsonb`),
  },
  (t) => contentIndexes("puzzles", t)
);

export const shaders = pgTable(
  "shaders",
  {
    ...contentColumns(),
    starterCode: text("starter_code").notNull().default(""),
    // { referenceImage, width, height, tolerance, requiredMatch }.
    // The reference is public because learners need to see the target image.
    puzzleConfig: jsonb("puzzle_config"),
  },
  (t) => contentIndexes("shaders", t)
);

export const circuits = pgTable(
  "circuits",
  {
    ...contentColumns(),
    // { components, connections, chips }
    starterCircuit: jsonb("starter_circuit").notNull().default(sql`'{}'::jsonb`),
    // null = sandbox/lesson; otherwise ordered INPUT/LED ids in starterCircuit.
    // { inputs: string[], outputs: string[] } is public; ids survive moving parts.
    puzzlePorts: jsonb("puzzle_ports"),
    // [{ input: boolean[], expected: boolean[] }], in puzzlePorts order.
    // SERVER ONLY: all circuit puzzle cases are hidden, including their inputs.
    testCases: jsonb("test_cases").notNull().default(sql`'[]'::jsonb`),
  },
  (t) => contentIndexes("circuits", t)
);

// "Coding projects". Table is named builds; the creator type id and the
// /projects URLs are unchanged for now.
export const builds = pgTable(
  "builds",
  {
    ...contentColumns(),
    // { python?: string, cpp?: string, rust?: string }
    starterCode: jsonb("starter_code").notNull().default(sql`'{}'::jsonb`),
  },
  (t) => contentIndexes("builds", t)
);

// ---------- courses ----------

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id").unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    // Ordered lesson slugs. A course points at lessons, it never copies them.
    lessonIds: text("lesson_ids").array().notNull().default(emptyTextArray),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("courses_owner_idx").on(t.ownerId),
    index("courses_lessons_idx").using("gin", t.lessonIds),
  ]
);

// ---------- circuit chips ----------

export const chips = pgTable(
  "chips",
  {
    id: text("id").primaryKey(), // the client-generated chip id
    ownerId: text("owner_id").notNull(),
    ownerName: text("owner_name").notNull().default(""),
    visibility: text("visibility").notNull().default("private"), // public | private
    name: text("name").notNull(),
    data: jsonb("data").notNull(), // the compiled chip (gates, outputSources, ...)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chips_owner_idx").on(t.ownerId), index("chips_visibility_idx").on(t.visibility)]
);

// ---------- creator projects (drafts) ----------

export const creatorProjects = pgTable(
  "creator_projects",
  {
    id: text("id").primaryKey(),
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

// ---------- comments ----------

// Comments use the same polymorphic item namespace as ratings so one thread can
// be attached to any published lesson, puzzle, shader, circuit, course, or
// coding project. A nullable parent creates the Reddit-style reply tree.
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    parentId: uuid("parent_id").references(() => comments.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status").notNull().default("visible"), // visible | pending | hidden | deleted
    spamScore: smallint("spam_score").notNull().default(0),
    moderationReason: text("moderation_reason"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("comments_item_idx").on(t.itemType, t.itemId, t.createdAt),
    index("comments_parent_idx").on(t.parentId),
    index("comments_user_idx").on(t.userId),
    index("comments_status_idx").on(t.status, t.createdAt),
  ]
);

export const commentVotes = pgTable(
  "comment_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(), // 1 = like, -1 = dislike
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.commentId] }),
    index("comment_votes_comment_idx").on(t.commentId),
    check("comment_votes_value_check", sql`${t.value} in (-1, 1)`),
  ]
);

export const commentReports = pgTable(
  "comment_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("open"), // open | dismissed | actioned
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("comment_reports_reporter_comment_idx").on(t.reporterId, t.commentId),
    index("comment_reports_status_idx").on(t.status, t.createdAt),
    index("comment_reports_comment_idx").on(t.commentId),
  ]
);

export const commentModerationActions = pgTable(
  "comment_moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    moderatorId: text("moderator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comment_actions_comment_idx").on(t.commentId, t.createdAt)]
);

// Global moderators and administrators are assigned outside the public UI. A
// content moderator can additionally be granted permission for one item by its
// owner or an administrator.
export const moderationRoles = pgTable(
  "moderation_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // moderator | admin
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] }), index("moderation_roles_role_idx").on(t.role)]
);

export const contentModerators = pgTable(
  "content_moderators",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemType, t.itemId] }),
    index("content_moderators_item_idx").on(t.itemType, t.itemId),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    type: text("type").notNull(), // reply | mention | published | course_activity
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_recipient_idx").on(t.recipientId, t.createdAt), index("notifications_unread_idx").on(t.recipientId, t.readAt)]
);

export const contentSubscriptions = pgTable(
  "content_subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    events: text("events").array().notNull().default(sql`'{reply,mention,published,course_activity}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemType, t.itemId] }),
    index("content_subscriptions_item_idx").on(t.itemType, t.itemId),
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

// One row per user and UTC calendar day with qualifying activity. Keeping the
// activity dates separate from completion progress means re-solving a puzzle
// cannot inflate a streak, while a user can still build a streak by solving a
// different puzzle on a later day.
export const dailyActivity = pgTable(
  "daily_activity",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activityDate: date("activity_date", { mode: "string" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.activityDate] }),
    index("daily_activity_user_date_idx").on(t.userId, t.activityDate),
  ]
);

// ---------- media ----------

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
