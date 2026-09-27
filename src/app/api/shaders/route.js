import fs from "node:fs";
import path from "node:path";

const SHADERS_DIR = path.join(process.cwd(), "content/shaders");
const SHADER_PATH = path.join(SHADERS_DIR, "shader.json");
const MAX_CODE_LENGTH = 20_000;

// Deliberately basic: one shared shader slot, no ids, no listing, no
// per-user ownership. Save/load just means "write/read this one file" —
// multiple saved shaders can come later.

export async function GET() {
  if (!fs.existsSync(SHADER_PATH)) {
    return Response.json({ code: null });
  }
  try {
    const record = JSON.parse(fs.readFileSync(SHADER_PATH, "utf8"));
    return Response.json({ code: record.code ?? null, updatedAt: record.updatedAt ?? null });
  } catch {
    // A corrupted or unreadable file shouldn't break the page — just act
    // as if nothing has been saved yet.
    return Response.json({ code: null });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.code !== "string" || body.code.trim() === "") {
    return Response.json({ error: "No shader code to save." }, { status: 400 });
  }
  if (body.code.length > MAX_CODE_LENGTH) {
    return Response.json({ error: "Shader source is too long." }, { status: 400 });
  }

  fs.mkdirSync(SHADERS_DIR, { recursive: true });

  const record = { code: body.code, updatedAt: new Date().toISOString() };
  fs.writeFileSync(SHADER_PATH, JSON.stringify(record, null, 2), "utf8");

  return Response.json({ updatedAt: record.updatedAt });
}