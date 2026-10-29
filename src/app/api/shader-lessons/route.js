import { shaderStore } from "@/lib/db/stores";
import { readPublishRequest, saveErrorResponse } from "@/lib/publish";
import { getShaderPuzzle, InvalidShaderPuzzleError } from "@/lib/shaders/puzzle";
import { notifyPublished } from "@/lib/notifications";
import {
  FRAGMENT_SHADER_MODE,
  PROGRAMMABLE_3D_MODE,
  normalizeProgrammableFiles,
  primaryFragmentSource,
  validateProgrammableFiles,
} from "@/lib/shaders/programmable3d";

const MAX_CODE_LENGTH = 20_000;

export async function POST(request) {
  const p = await readPublishRequest(request, "shader", "shader", { categorised: false });
  if (p.response) return p.response;

  const starterCode = typeof p.body.starterCode === "string" ? p.body.starterCode : "";
  if (p.body.mode != null && p.body.mode !== FRAGMENT_SHADER_MODE && p.body.mode !== PROGRAMMABLE_3D_MODE) {
    return Response.json({ error: "Unknown shader project mode." }, { status: 400 });
  }
  const runtime = p.body.mode === PROGRAMMABLE_3D_MODE ? PROGRAMMABLE_3D_MODE : FRAGMENT_SHADER_MODE;
  let sourceFiles = null;
  if (runtime === PROGRAMMABLE_3D_MODE) {
    const filesError = validateProgrammableFiles(p.body.files);
    if (filesError) return Response.json({ error: filesError }, { status: 400 });
    sourceFiles = normalizeProgrammableFiles(p.body.files);
  }
  if (starterCode.length > MAX_CODE_LENGTH && runtime === FRAGMENT_SHADER_MODE) {
    return Response.json({ error: "Shader source is too long." }, { status: 400 });
  }

  let puzzleConfig;
  try {
    puzzleConfig = p.body.puzzle == null ? null : getShaderPuzzle(p.body.puzzle);
  } catch (error) {
    if (error instanceof InvalidShaderPuzzleError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const result = await shaderStore.save({
    ownerId: p.user.id,
    projectId: p.project.id,
    title: p.title,
    summary: p.summary,
    body: p.markdown,
    ...p.selection,
    payload: {
      runtime,
      starterCode: runtime === FRAGMENT_SHADER_MODE ? starterCode : primaryFragmentSource(sourceFiles),
      sourceFiles,
      puzzleConfig: runtime === FRAGMENT_SHADER_MODE ? puzzleConfig : null,
    },
  });
  if (!result.ok) return saveErrorResponse(result);
  await notifyPublished({ actorId: p.user.id, itemType: "shader", itemId: result.slug, title: p.title });

  return Response.json({ id: result.slug });
}
