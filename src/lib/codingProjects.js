import { cache } from "react";
import { buildStore } from "./db/stores";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

// Only PUBLISHED builds (rows in the builds table). Drafts live in creator_projects
// and are never searchable.
export async function getAllProjects() {
  return buildStore.list({ onlyAvailable: true });
}

export const getBuildById = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;
  return buildStore.getBySlug(id);
});
