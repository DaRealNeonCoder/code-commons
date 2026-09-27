import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { loadTaxonomy, isValidSelection } from "@/lib/taxonomy";

const CIRCUITS_DIR = path.join(process.cwd(), "content/circuits");
const EMPTY_CIRCUIT = { components: [], connections: [], chips: {} };

function slugify(input) {
  const base = (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `circuit-${Date.now()}`;
}

function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (fs.existsSync(path.join(CIRCUITS_DIR, `${slug}.mdx`))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

function isValidCircuit(c) {
  return (
    c &&
    typeof c === "object" &&
    Array.isArray(c.components) &&
    Array.isArray(c.connections) &&
    c.chips &&
    typeof c.chips === "object" &&
    !Array.isArray(c.chips)
  );
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
    return Response.json({ error: "A title is required." }, { status: 400 });
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

  const taxonomy = loadTaxonomy();
  if (!isValidSelection(taxonomy, selection)) {
    return Response.json({ error: "One or more areas/topics/tags/language/difficulty is not recognized." }, { status: 400 });
  }

  fs.mkdirSync(CIRCUITS_DIR, { recursive: true });

  const slug = uniqueSlug(slugify(body.title));
  const fullPath = path.join(CIRCUITS_DIR, `${slug}.mdx`);

  if (!fullPath.startsWith(CIRCUITS_DIR + path.sep)) {
    return Response.json({ error: "Invalid name." }, { status: 400 });
  }

  const circuit = isValidCircuit(body.starterCircuit) ? body.starterCircuit : EMPTY_CIRCUIT;

  const frontmatter = {
    title: body.title,
    summary: typeof body.summary === "string" ? body.summary : "",
    available: true,
    starterCircuit: JSON.stringify(circuit),
    areas: selection.areas,
    topics: selection.topics,
    tags: selection.tags,
    languages: selection.languages,
    difficulty: selection.difficulty,
  };

  fs.writeFileSync(fullPath, matter.stringify(body.content, frontmatter), "utf8");

  return Response.json({ id: slug });
}