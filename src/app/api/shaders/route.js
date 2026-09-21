import fs from "node:fs";
import path from "node:path";

const SHADERS_DIR = path.join(process.cwd(), "content/shaders");
const MAX_CODE_LENGTH = 20_000;

function generateId() {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `shader-${stamp}${random}`;
}

function uniqueId() {
  let id = generateId();
  while (fs.existsSync(path.join(SHADERS_DIR, `${id}.json`))) {
    id = generateId();
  }
  return id;
}

// Deliberately basic, per the current scope: anonymous save, no listing,
// no loading, no per-user ownership. Browsing/loading saved shaders is a
// separate feature for later, same as the original request described.
export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.code !== "string" || body.code.trim() === "") {
    return Response.json({ error: "No shader code to save." }, { status: 400 });
  }
  if (body.code.length > MAX_CODE_LENGTH) {
    return Response.json({ error: "Shader source is too long." }, { status: 400 });
  }

  fs.mkdirSync(SHADERS_DIR, { recursive: true });

  const id = uniqueId();
  const fullPath = path.join(SHADERS_DIR, `${id}.json`);

  // Defense in depth: id is generated server-side above, never taken from
  // user input, but double-check the resolved path stays inside SHADERS_DIR.
  if (!fullPath.startsWith(SHADERS_DIR + path.sep)) {
    return Response.json({ error: "Could not save shader." }, { status: 400 });
  }

  const record = {
    id,
    code: body.code,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(fullPath, JSON.stringify(record, null, 2), "utf8");

  return Response.json({ id });
}