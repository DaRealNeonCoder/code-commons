import { circuitStore } from "@/lib/db/stores";
import { readPublishRequest, saveErrorResponse } from "@/lib/publish";
import { parseCircuit, EMPTY_CIRCUIT } from "@/lib/circuits/circuitData";

const MAX_CIRCUIT_CHARS = 1_000_000;

export async function POST(request) {
  const p = await readPublishRequest(request, "circuit", "circuit");
  if (p.response) return p.response;

  // Missing circuit = empty one; a present but malformed one is rejected.
  const raw = p.body.starterCircuit;
  const circuit = raw === undefined || raw === null ? EMPTY_CIRCUIT : parseCircuit(raw);
  if (!circuit || JSON.stringify(circuit).length > MAX_CIRCUIT_CHARS) {
    return Response.json({ error: "The starter circuit is invalid or too large." }, { status: 400 });
  }

  const result = await circuitStore.save({
    ownerId: p.user.id,
    projectId: p.project.id,
    title: p.title,
    summary: p.summary,
    body: p.markdown,
    ...p.selection,
    payload: { starterCircuit: circuit },
  });
  if (!result.ok) return saveErrorResponse(result);

  return Response.json({ id: result.slug });
}
