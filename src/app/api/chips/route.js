import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { auth } from "@/lib/auth";

// Same local-filesystem caveat as app/api/projects/route.js — fine for local
// dev / a self-hosted server, not for a read-only serverless filesystem.
const CHIPS_DIR = path.join(process.cwd(), "data", "chips");

// Chip ids become file names, so only allow characters that can't escape the folder.
const VALID_ID = /^[A-Za-z0-9_-]{1,100}$/;
const VISIBILITIES = ["public", "private"];

export const dynamic = "force-dynamic"; // the response depends on who is signed in

async function getSessionUser(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

const chipPath = (id) => path.join(CHIPS_DIR, `${id}.json`);

async function readChip(id) {
  try {
    return JSON.parse(await fs.readFile(chipPath(id), "utf8"));
  } catch {
    return null;
  }
}

async function writeChip(chip) {
  await fs.mkdir(CHIPS_DIR, { recursive: true });
  await fs.writeFile(chipPath(chip.id), JSON.stringify(chip, null, 2), "utf8");
}

// Chips saved before visibility existed have no visibility field: they stay public.
function isVisibleTo(chip, userId) {
  if (chip.visibility !== "private") return true;
  return Boolean(userId) && chip.ownerId === userId;
}

// What the browser gets: never the owner's id, plus a per-viewer "mine" flag.
function toClientChip(chip, userId) {
  const { ownerId, ...rest } = chip;
  return {
    ...rest,
    visibility: chip.visibility === "private" ? "private" : "public",
    mine: Boolean(userId) && ownerId === userId,
  };
}

// GET /api/chips -> { ok: true, chips: [...] }
// Public chips from everyone, plus the signed-in user's own private chips.
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    const userId = user?.id ?? null;

    await fs.mkdir(CHIPS_DIR, { recursive: true });
    const files = await fs.readdir(CHIPS_DIR);

    const loaded = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            return JSON.parse(await fs.readFile(path.join(CHIPS_DIR, f), "utf8"));
          } catch {
            return null; // one corrupt file shouldn't hide every other chip
          }
        })
    );

    const chips = loaded
      .filter((chip) => chip && isVisibleTo(chip, userId))
      .map((chip) => toClientChip(chip, userId))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json({ ok: true, chips });
  } catch {
    return NextResponse.json({ ok: true, chips: [] });
  }
}

// POST /api/chips  <CompiledChip & { visibility: "public" | "private" }>
// Requires sign-in. Visibility defaults to private when missing or invalid.
export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Sign in to save chips." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.id || !body?.name) {
    return NextResponse.json({ ok: false, error: "Chip is missing an id or name" }, { status: 400 });
  }
  if (typeof body.id !== "string" || !VALID_ID.test(body.id)) {
    return NextResponse.json({ ok: false, error: "Invalid chip id" }, { status: 400 });
  }

  try {
    // Never overwrite a chip that belongs to someone else (or to nobody, for legacy chips).
    const existing = await readChip(body.id);
    if (existing && existing.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "A chip with this id already exists." }, { status: 403 });
    }

    // Ownership comes from the session, never from the request body.
    const { ownerId, ownerName, mine, ...compiled } = body;
    const visibility = VISIBILITIES.includes(body.visibility) ? body.visibility : "private";

    await writeChip({ ...compiled, visibility, ownerId: user.id, ownerName: user.name || "" });
    return NextResponse.json({ ok: true, visibility });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save chip" }, { status: 500 });
  }
}

// PATCH /api/chips  { id, visibility } — owner only.
export async function PATCH(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Sign in to change a chip." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!VALID_ID.test(body?.id ?? "") || !VISIBILITIES.includes(body?.visibility)) {
    return NextResponse.json(
      { ok: false, error: "A valid id and a visibility of public or private are required." },
      { status: 400 }
    );
  }

  try {
    const chip = await readChip(body.id);
    if (!chip) return NextResponse.json({ ok: false, error: "Chip not found." }, { status: 404 });
    if (chip.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "You can only change your own chips." }, { status: 403 });
    }

    await writeChip({ ...chip, visibility: body.visibility });
    return NextResponse.json({ ok: true, visibility: body.visibility });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update chip" }, { status: 500 });
  }
}