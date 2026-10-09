import { parseFrontmatter,stringifyFrontmatter } from "../frontmatter.js";
import { getDbLessonBySlug, saveDbLesson } from "./lessons";
// Round-trip between a lesson's .mdx text and its DB row.
//
//   MDX string  --parseLessonMdx-->  fields  --saveLessonMdx-->  DB row
//   DB row      --getDbLessonBySlug-->  lesson  --stringifyLessonMdx-->  MDX string
//
// Frontmatter is stored in real columns (so you can filter/sort in SQL); the
// DB `body` column holds the MDX below the frontmatter, untouched.
//
// Anything not in the list below (unknown frontmatter keys) is dropped on
// purpose: the DB only keeps fields it has columns for.

const str = (v) => (typeof v === "string" ? v : "");
const strArray = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

// Parse an .mdx string into the fields saveDbLesson expects.
// Throws if the YAML frontmatter is malformed (gray-matter's error).
//
// This is the single place raw MDX enters the DB pipeline, so it's where any
// future body checks would go.
export function parseLessonMdx(raw) {
const { data, content } = parseFrontmatter(raw);

  return {
    title: str(data.title).trim(),
    summary: str(data.summary).trim(),
    order: Number.isInteger(data.order) ? data.order : null,
    available: data.available !== false, // missing = available, like the file reader
    projectId: str(data.projectId) || null,
    puzzles: strArray(data.puzzles),
    areas: strArray(data.areas),
    topics: strArray(data.topics),
    tags: strArray(data.tags),
    languages: strArray(data.languages),
    difficulty: str(data.difficulty).trim() || "beginner",
    // Drop leading blank lines and trailing whitespace only. Leading spaces on
    // the first line can be meaningful in markdown (indented code).
    body: content.replace(/^\s*\n/, "").trimEnd(),
  };
}

// Turn a lesson object back into .mdx text. Works for both DB lessons and
// file lessons (anything shaped like { title, content, ... }).
export function stringifyLessonMdx(lesson) {
  // js-yaml throws on undefined values, so only add keys that have a value.
  const frontmatter = { title: lesson.title };
  if (lesson.order != null) frontmatter.order = lesson.order;
  frontmatter.summary = lesson.summary ?? "";
  frontmatter.available = lesson.available !== false;
  if (lesson.projectId) frontmatter.projectId = lesson.projectId;
  frontmatter.puzzles = strArray(lesson.puzzles);
  frontmatter.areas = strArray(lesson.areas);
  frontmatter.topics = strArray(lesson.topics);
  frontmatter.tags = strArray(lesson.tags);
  frontmatter.languages = strArray(lesson.languages);
  frontmatter.difficulty = lesson.difficulty || "beginner";

  return stringifyFrontmatter(lesson.content ?? "", frontmatter);
}

// Parse an MDX string and write it to the DB.
//
//   await saveLessonMdx(mdxString, { ownerId: user.id })
//   await saveLessonMdx(mdxString, { ownerId: user.id, projectId: project.id })
//
// Options:
//   ownerId        required. Always comes from the session, never from frontmatter.
//   projectId      overrides frontmatter `projectId` (re-saving updates the same lesson).
//   slug           pin the slug instead of deriving it from the title (importing files).
//   reservedSlugs  official lesson slugs that user lessons must not take.
//
// Returns { ok: true, slug } or { ok: false, error } where error is one of:
//   invalid_frontmatter | missing_title | empty_body | missing_owner |
//   body_too_long | forbidden | conflict | slug_unavailable
export async function saveLessonMdx(raw, { ownerId, projectId, slug, reservedSlugs } = {}) {
  let parsed;
  try {
    parsed = parseLessonMdx(raw);
  } catch {
    return { ok: false, error: "invalid_frontmatter" };
  }

  if (!parsed.title) return { ok: false, error: "missing_title" };
  if (!parsed.body.trim()) return { ok: false, error: "empty_body" };

  return saveDbLesson(
    { ...parsed, ownerId, slug, projectId: projectId ?? parsed.projectId },
    { reservedSlugs }
  );
}

// Fetch a lesson back out as .mdx text (for editing in the creator, exporting,
// or diffing against the file version). Returns null if it doesn't exist.
export async function getDbLessonMdx(slug) {
  const lesson = await getDbLessonBySlug(slug);
  return lesson ? stringifyLessonMdx(lesson) : null;
}
