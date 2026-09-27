import path from "node:path";
import { createMdxCollection } from "@/lib/content/mdxCollection";

const CIRCUITS_DIR = path.join(process.cwd(), "content/circuits");

const EMPTY_CIRCUIT = JSON.stringify({ components: [], connections: [], chips: {} });

const { getAll, getById } = createMdxCollection(CIRCUITS_DIR, { starterCircuit: EMPTY_CIRCUIT });

export function getAllCircuits() {
  return getAll();
}

export function getCircuitById(id) {
  return getById(id);
}