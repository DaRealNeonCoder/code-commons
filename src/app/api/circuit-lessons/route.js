import { circuitStore } from "@/lib/db/stores";
import { readPublishRequest, saveErrorResponse } from "@/lib/publish";
import { parseCircuit, EMPTY_CIRCUIT } from "@/lib/circuits/circuitData";
import {
  getPuzzlePorts,
  getPuzzleTests,
  InvalidCircuitError,
  InvalidPuzzleError,
  validatePuzzleCircuit,
} from "@/lib/circuits/puzzle";

const MAX_CIRCUIT_CHARS = 1_000_000;
const MAX_PUZZLE_CHARS = 1_500_000;

export async function POST(request) {
  const p = await readPublishRequest(request, "circuit", "circuit", { categorised: false });
  if (p.response) return p.response;

  // Missing circuit = empty one; a present but malformed one is rejected.
  const raw = p.body.starterCircuit;
  const circuit = raw === undefined || raw === null ? EMPTY_CIRCUIT : parseCircuit(raw);
  if (!circuit || JSON.stringify(circuit).length > MAX_CIRCUIT_CHARS) {
    return Response.json({ error: "The starter circuit is invalid or too large." }, { status: 400 });
  }

  let puzzlePorts = null;
  let testCases = [];
  if (p.body.puzzlePorts !== null && p.body.puzzlePorts !== undefined) {
    try {
      puzzlePorts = getPuzzlePorts(p.body.puzzlePorts, circuit);
      testCases = getPuzzleTests(p.body.testCases, puzzlePorts).map((test) => ({
        ...test,
        hidden: true,
      }));
      validatePuzzleCircuit(circuit, puzzlePorts);
    } catch (error) {
      if (error instanceof InvalidPuzzleError || error instanceof InvalidCircuitError) {
        return Response.json({ error: "The circuit puzzle configuration is invalid." }, { status: 400 });
      }
      throw error;
    }
    if (testCases.length === 0 || JSON.stringify({ puzzlePorts, testCases }).length > MAX_PUZZLE_CHARS) {
      return Response.json({ error: "Add valid hidden test cases to the circuit puzzle." }, { status: 400 });
    }
  }

  const result = await circuitStore.save({
    ownerId: p.user.id,
    projectId: p.project.id,
    title: p.title,
    summary: p.summary,
    body: p.markdown,
    ...p.selection,
    payload: { starterCircuit: circuit, puzzlePorts, testCases },
  });
  if (!result.ok) return saveErrorResponse(result);

  return Response.json({ id: result.slug });
}
