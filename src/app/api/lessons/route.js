import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { loadTaxonomy, isValidSelection } from "@/lib/taxonomy";
import { normalizePuzzleIds, findMissingPuzzleIds } from "@/lib/lessonPuzzles";
import { getOfficialLessonIds } from "@/lib/lessonStore";
import { parseBlocks } from "@/lib/lessonBlocks";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";
import { saveLessonMdx, stringifyLessonMdx } from "@/lib/db/lessonMdx";

function asArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

const SAVE_ERRORS = {
  forbidden: [403, "That lesson belongs to someone else."],
  body_too_long: [413, "This lesson is too long."],
  slug_unavailable: [409, "Couldn't find a free URL for this lesson. Try a different title."],
  conflict: [409, "This lesson conflicts with an existing one."],
};

// Publishes a lesson project to the database.
//
// The browser sends the creator's BLOCKS, not finished markdown. The server
// checks their shape, builds the markdown/MDX itself (text escaped as data, see
// lib/blocksToMarkdown.js), and stores the result. A raw MDX string from the
// client is never accepted.
//
// The row records which project it came from (`projectId`), so saving the same
// project again updates the same lesson instead of creating a duplicate.
//
// Ownership comes from the project: the caller must be signed in AND own a
// project of type "lesson". Any existing puzzle may be linked, but only into a
// lesson the caller owns, and the update only applies to a row whose owner
// matches the session.
export async function POST(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const project = typeof body?.projectId === "string" ? await getProject(body.projectId) : null;
  if (!project || project.type !== "lesson" || project.userId !== user.id) {
    return Response.json({ error: "That lesson project isn't yours." }, { status: 403 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) {
    return Response.json({ error: "A lesson title is required." }, { status: 400 });
  }
  if (!body.difficulty || typeof body.difficulty !== "string") {
    return Response.json({ error: "Pick a difficulty." }, { status: 400 });
  }

  const blocks = parseBlocks(body.blocks);
  if (!blocks) {
    return Response.json({ error: "The lesson content is invalid." }, { status: 400 });
  }
  const markdown = blocksToMarkdown(blocks);
  if (markdown.trim() === "") {
    return Response.json({ error: "Add at least one text block." }, { status: 400 });
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
  // allowed; ownership is enforced on the lesson, not on the puzzle.
  const puzzles = normalizePuzzleIds(body.puzzles);
  const missing = await findMissingPuzzleIds(puzzles);
  if (missing.length > 0) {
    return Response.json({ error: `No puzzle found with ID: ${missing.join(", ")}.` }, { status: 400 });
  }

  // Assemble the MDX file on the server. stringifyLessonMdx uses a real YAML
  // serializer, so titles/summaries with quotes, colons, etc. can't break or
  // inject into the frontmatter.
  const mdx = stringifyLessonMdx({
    title,
    summary: typeof body.summary === "string" ? body.summary.trim().slice(0, 500) : "",
    available: true,
    projectId: project.id,
    puzzles,
    ...selection,
    content: markdown,
  });

  const result = await saveLessonMdx(mdx, {
    ownerId: user.id, // from the session, never from the request
    projectId: project.id,
    reservedSlugs: getOfficialLessonIds(), // a user lesson can't take an official URL
  });

  if (!result.ok) {
    const [status, error] = SAVE_ERRORS[result.error] ?? [400, "Couldn't save the lesson."];
    return Response.json({ error }, { status });
  }

  return Response.json({ id: result.slug });
}
