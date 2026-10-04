import { shaderStore } from "@/lib/db/stores";
import { readPublishRequest, saveErrorResponse } from "@/lib/publish";

const MAX_CODE_LENGTH = 20_000;

export async function POST(request) {
  const p = await readPublishRequest(request, "shader", "shader");
  if (p.response) return p.response;

  const starterCode = typeof p.body.starterCode === "string" ? p.body.starterCode : "";
  if (starterCode.length > MAX_CODE_LENGTH) {
    return Response.json({ error: "Shader source is too long." }, { status: 400 });
  }

  const result = await shaderStore.save({
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
