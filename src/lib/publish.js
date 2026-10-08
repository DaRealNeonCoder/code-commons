import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { loadTaxonomy, isValidSelection } from "@/lib/taxonomy";
import { parseBlocks } from "@/lib/lessonBlocks";
import { blocksToMarkdown } from "@/lib/blocksToMarkdown";

// Shared front half of every "publish a creator project" route (puzzle, shader,
// circuit, build). Same rules as /api/lessons:
//   - signed in AND owns a creator project of the right type
//   - the browser sends BLOCKS; the server validates them and builds the markdown
//   - taxonomy ids must be in the controlled vocabulary
// Returns { response } to send straight back, or the validated pieces.

const fail = (error, status) => ({ response: Response.json({ error }, { status }) });

const asArray = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);

const NO_SELECTION = {
  areas: [],
  topics: [],
  tags: [],
  languages: [],
  difficulty: "",
};

export async function readPublishRequest(
  request,
  projectType,
  noun,
  { categorised = true } = {}
) {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user) return fail("Sign in required.", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request.", 400);

  const project = typeof body.projectId === "string" ? await getProject(body.projectId) : null;
  if (!project || project.type !== projectType || project.userId !== user.id) {
    return fail(`That ${noun} project isn't yours.`, 403);
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return fail("A title is required.", 400);

  if (categorised && (!body.difficulty || typeof body.difficulty !== "string")) {
    return fail("Pick a difficulty.", 400);
  }

  const blocks = parseBlocks(body.blocks);
  if (!blocks) return fail("The text content is invalid.", 400);
  const markdown = blocksToMarkdown(blocks);
  if (markdown.trim() === "") return fail("Add at least one text block.", 400);

  let selection = NO_SELECTION;
  if (categorised) {
    selection = {
      areas: asArray(body.areas),
      topics: asArray(body.topics),
      tags: asArray(body.tags),
      languages: asArray(body.languages),
      difficulty: body.difficulty,
    };
    if (!isValidSelection(loadTaxonomy(), selection)) {
      return fail("One or more areas/topics/tags/language/difficulty is not recognized.", 400);
    }
  }

  const given = typeof body.summary === "string" ? body.summary.trim() : "";
  const summary = (given || deriveSummary(markdown, title)).slice(0, 500);

  return { user, project, body, title, summary, markdown, selection };
}

const SAVE_ERRORS = {
  forbidden: [403, "That belongs to someone else."],
  body_too_long: [413, "The text is too long."],
  slug_unavailable: [409, "Couldn't find a free URL. Try a different title."],
  conflict: [409, "This conflicts with an existing item."],
};

export function saveErrorResponse(result) {
  const [status, error] = SAVE_ERRORS[result.error] ?? [400, "Couldn't save."];
  return Response.json({ error }, { status });
}

// Plain-text one-liner for search cards when the author didn't write a summary.
// Works on the generated markdown: drops the title line, code fences, and the
// backslash escapes blocksToMarkdown adds.
export function deriveSummary(markdown, title, max = 160) {
  const titleKey = title.trim().toLowerCase();
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((line) => line.replace(/^#+\s*/, "").replace(/\\(.)/g, "$1").replace(/\*/g, "").trim().toLowerCase() !== titleKey)
    .join(" ")
    .replace(/\\([\\`*_[\]{}<>])/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
