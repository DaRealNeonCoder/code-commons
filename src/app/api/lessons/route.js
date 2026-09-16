import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getAllLessons } from "@/lib/pythonLessons";

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

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
    return Response.json({ error: "A lesson title is required." }, { status: 400 });
  }
  if (typeof body.content !== "string" || body.content.trim() === "") {
    return Response.json({ error: "Add at least one text block." }, { status: 400 });
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
    // The block editor only produces Python starter code for now, so new
    // lessons are locked to Python — same treatment as hello-world.mdx.
    // Drop `lockedLanguage` here (and add cpp/rust keys below) once the
    // editor supports authoring starter code in more than one language.
    lockedLanguage: "python",
    starterCode: {
      python: typeof body.starterCode === "string" ? body.starterCode : "",
    },
  };

  // matter.stringify uses a real YAML serializer, so titles/summaries with
  // quotes, colons, etc. can't break or inject into the frontmatter.
  const fileContents = matter.stringify(body.content, frontmatter);
  fs.writeFileSync(fullPath, fileContents, "utf8");

  return Response.json({ id: slug });
}