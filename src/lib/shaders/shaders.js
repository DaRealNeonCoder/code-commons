import path from "node:path";
import { createMdxCollection } from "@/lib/content/mdxCollection";

const SHADERS_DIR = path.join(process.cwd(), "content/shaders");

const { getAll, getById } = createMdxCollection(SHADERS_DIR, { starterCode: "" });

export function getAllShaders() {
  return getAll();
}

export function getShaderById(id) {
  return getById(id);
}