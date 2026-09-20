import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getAllLessons } from "@/lib/lessons";
import { loadTaxonomy, isValidSelection } from "@/lib/taxonomy";

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

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
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

  fs.mkdirSync(LESSONS_DIR, { recursive: true });

  const slug = uniqueSlug(slugify(body.title));
  const fullPath = path.join(LESSONS_DIR, `${slug}.mdx`);

  // Defense in depth: the slug is already sanitized above, but double-check
  // the resolved path never leaves the lessons directory before writing.
  if (!fullPath.startsWith(LESSONS_DIR + path.sep)) {
    return Response.json({ error: "Invalid lesson name." }, { status: 400 });
  }

  const existingOrders = getAllLessons().map((lesson) => lesson.order ?? 0);
  const nextOrder = existingOrders.length ? Math.max(...existingOrders) + 1 : 1;

  const frontmatter = {
    title: body.title,
    order: nextOrder,
    summary: typeof body.summary === "string" ? body.summary : "",
    available: true,
    starterCode: typeof body.starterCode === "string" ? body.starterCode : "",
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