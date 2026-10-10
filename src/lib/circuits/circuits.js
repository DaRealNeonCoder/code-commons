import { cache } from "react";
import { circuitStore } from "@/lib/db/stores";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

export async function getAllCircuits() {
  return circuitStore.list({ onlyAvailable: false });
}

// Full SERVER-ONLY record, including hidden puzzle test cases. Pages must pass
// explicit public props, never spread this record into a client component.
// `starterCircuit` is jsonb. Validate it with parseCircuit before use.
export const getCircuitById = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;
  return circuitStore.getBySlug(id);
});
