import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { getAllLessons } from "@/lib/lessons";
import { loadTaxonomy, isValidSelection } from "@/lib/taxonomy";
import { normalizePuzzleIds, findMissingPuzzleIds } from "@/lib/lessonPuzzles";

const LESSONS_DIR = path.join(process.cwd(), "content/lessons");

function slugify(input) {
  const base = (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `lesson-${Date.now()}`;
}

function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (fs.existsSync(path.join(LESSONS_DIR, `${slug}.mdx`))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

// Publishes a lesson project as content/lessons/<id>.mdx.
//
// The file records which project it came from (`projectId`), so saving the same
// project again updates the same lesson instead of creating a duplicate.
//
// Ownership comes from the project: the caller must be signed in AND own a
// project of type "lesson". Any existing puzzle may be linked, but only into a
// lesson the caller owns, and nobody can overwrite someone else's lesson
// because the file to update is looked up by the caller's own project ID.
export async function POST(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const project = typeof body?.projectId === "string" ? getProject(body.projectId) : null;
  if (!project || project.type !== "lesson" || project.userId !== user.id) {
    return Response.json({ error: "That lesson project isn't yours." }, { status: 403 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) {
    return Response.json({ error: "A lesson title is required." }, { status: 400 });
  }
  if (typeof body.content !== "string" || body.content.trim() === "") {
    return Response.json({ error: "Add at least one text block." }, { status: 400 });
  }
  if (!body.difficulty || typeof body.difficulty !== "string") {
    return Response.json({ error: "Pick a difficulty." }, { status: 400 });
  }

  const selection = {
    areas: asArray(body.areas),
    topics: asArray(body.topics),
    tags: asArray(body.tags),
    languages: asArray(body.languages),
    difficulty: body.difficulty,
  };

  // Defense in depth: the Create page only ever offers taxonomy checkboxes,
  // but this rejects anything not in the controlled vocabulary even if the
  // API is called directly, bypassing the UI.
  const taxonomy = loadTaxonomy();
  if (!isValidSelection(taxonomy, selection)) {
    return Response.json({ error: "One or more areas/topics/tags/language/difficulty is not recognized." }, { status: 400 });
  }

  // Lessons reference existing puzzles by ID instead of copying them. Every ID
  // must be a safe slug that points at a real puzzle file. Any puzzle is
  // allowed; ownership is enforced on the lesson (above), not on the puzzle.
  const puzzles = normalizePuzzleIds(body.puzzles);
  const missing = findMissingPuzzleIds(puzzles);
  if (missing.length > 0) {
    return Response.json(
      { error: `No puzzle found with ID: ${missing.join(", ")}.` },
      { status: 400 },
    );
  }

  fs.mkdirSync(LESSONS_DIR, { recursive: true });

  const lessons = getAllLessons();
  const existing = lessons.find((lesson) => lesson.projectId === project.id);

  // Re-saving keeps the same file name (and so the same URL) and the same order.
  const slug = existing ? existing.id : uniqueSlug(slugify(title));
  const fullPath = path.join(LESSONS_DIR, `${slug}.mdx`);

  // Defense in depth: the slug is already sanitized above, but double-check
  // the resolved path never leaves the lessons directory before writing.
  if (!fullPath.startsWith(LESSONS_DIR + path.sep)) {
    return Response.json({ error: "Invalid lesson name." }, { status: 400 });
  }

  const existingOrders = lessons.map((lesson) => lesson.order ?? 0);
  const nextOrder = existingOrders.length ? Math.max(...existingOrders) + 1 : 1;

  const frontmatter = {
    title,
    order: existing?.order ?? nextOrder,
    summary: typeof body.summary === "string" ? body.summary.trim().slice(0, 500) : "",
    available: true,
    projectId: project.id,
    puzzles,
    areas: selection.areas,
    topics: selection.topics,
    tags: selection.tags,
    languages: selection.languages,
    difficulty: selection.difficulty,
  };

  // matter.stringify uses a real YAML serializer, so titles/summaries with
  // quotes, colons, etc. can't break or inject into the frontmatter.
  const fileContents = matter.stringify(body.content, frontmatter);
  fs.writeFileSync(fullPath, fileContents, "utf8");

  return Response.json({ id: slug });
}