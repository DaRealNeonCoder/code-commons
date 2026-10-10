import { getCircuitById } from "@/lib/circuits/circuits";
import { checkCircuitSolution, InvalidCircuitError } from "@/lib/circuits/puzzle";

const MAX_CIRCUIT_CHARS = 1_000_000;

export async function POST(request, { params }) {
  try {
    const { circuitId } = await params;
    if (typeof circuitId !== "string" || !/^[a-z0-9][a-z0-9_-]*$/i.test(circuitId)) {
      return Response.json({ error: "Invalid circuit id." }, { status: 400 });
    }
    const puzzle = await getCircuitById(circuitId);
    if (!puzzle?.available || !puzzle.puzzlePorts) {
      return Response.json({ error: "Circuit puzzle not found." }, { status: 404 });
    }
    const text = await request.text();
    if (text.length > MAX_CIRCUIT_CHARS) {
      return Response.json({ error: "The circuit is too large." }, { status: 413 });
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    return Response.json(checkCircuitSolution(puzzle, body?.circuit), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InvalidCircuitError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Circuit puzzle check failed:", error);
    return Response.json({ error: "The circuit could not be checked. Please try again later." }, { status: 500 });
  }
}
