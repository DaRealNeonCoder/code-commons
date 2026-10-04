import { cache } from "react";
import { shaderStore } from "@/lib/db/stores";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

export async function getAllShaders() {
  return shaderStore.list({ onlyAvailable: false });
}

export const getShaderById = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;
  return shaderStore.getBySlug(id);
});
