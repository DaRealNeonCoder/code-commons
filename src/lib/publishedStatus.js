import { inArray } from "drizzle-orm";
import { db } from "./db";
import { lessons, puzzles, shaders, circuits, builds, courses } from "./db/schema";

const TABLES = {
  lesson: lessons,
  puzzle: puzzles,
  shader: shaders,
  circuit: circuits,
  project: builds,
  course: courses,
};

// Autosave and publish land within moments of each other; ignore small gaps.
const GRACE_MS = 5000;

function stateOf(projectUpdatedAt, publishedUpdatedAt) {
  const edited = new Date(projectUpdatedAt).getTime() - new Date(publishedUpdatedAt).getTime() > GRACE_MS;
  return edited ? "edited" : "published";
}

// projects: [{ id, type, updatedAt }] -> { [projectId]: { slug, state } }
// Anything missing from the result is a draft. One query per type, not per card.
export async function getPublishedForProjects(projects) {
  const byType = new Map();
  for (const p of projects) {
    if (!TABLES[p.type]) continue;
    if (!byType.has(p.type)) byType.set(p.type, []);
    byType.get(p.type).push(p);
  }

  const result = {};
  await Promise.all(
    [...byType].map(async ([type, list]) => {
      const table = TABLES[type];
      const rows = await db
        .select({ slug: table.slug, projectId: table.projectId, updatedAt: table.updatedAt })
        .from(table)
        .where(inArray(table.projectId, list.map((p) => p.id)));

      const projectsById = new Map(list.map((p) => [p.id, p]));
      for (const row of rows) {
        const project = projectsById.get(row.projectId);
        if (!project) continue;
        result[row.projectId] = { slug: row.slug, state: stateOf(project.updatedAt, row.updatedAt) };
      }
    })
  );
  return result;
}

// Single project, for the editor page. `project.updatedAt` is an ISO string.
export async function getPublishedInfo(project) {
  const published = (await getPublishedForProjects([project]))[project.id];
  return { publishedId: published?.slug ?? null, publishState: published?.state ?? "draft" };
}