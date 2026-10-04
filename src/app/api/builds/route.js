import { buildStore } from "@/lib/db/stores";
import { readPublishRequest, saveErrorResponse } from "@/lib/publish";

const LANGUAGE_IDS = ["python", "cpp", "rust"];
const MAX_CODE_LENGTH = 20_000;

// Accepts a string (treated as Python) or { python, cpp, rust }.
// Returns a clean object, or null if malformed.
function parseStarterCode(value) {
  if (value === undefined || value === null) return {};
  const source = typeof value === "string" ? { python: value } : value;
  if (typeof source !== "object" || Array.isArray(source)) return null;

  const out = {};
  for (const id of LANGUAGE_IDS) {
    const code = source[id];
    if (code === undefined) continue;
    if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) return null;
    if (code.trim()) out[id] = code;
  }
  return out;
}

export async function POST(request) {
  const p = await readPublishRequest(request, "project", "build");
  if (p.response) return p.response;

  const starterCode = parseStarterCode(p.body.starterCode);
  if (!starterCode) {
    return Response.json({ error: "The code is invalid or too long." }, { status: 400 });
  }

  const result = await buildStore.save({
    ownerId: p.user.id,
    projectId: p.project.id,
    title: p.title,
    summary: p.summary,
    body: p.markdown,
    ...p.selection,
    payload: { starterCode },
  });
  if (!result.ok) return saveErrorResponse(result);

  return Response.json({ id: result.slug });
}
