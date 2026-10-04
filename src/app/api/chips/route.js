import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listVisibleChips, saveChip, setChipVisibility } from "@/lib/db/chips";

// Chip ids are client-generated; only allow plain slug characters.
const VALID_ID = /^[A-Za-z0-9_-]{1,100}$/;
const VISIBILITIES = ["public", "private"];
const MAX_CHIP_CHARS = 500_000;

export const dynamic = "force-dynamic"; // the response depends on who is signed in

async function getSessionUser(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

// GET /api/chips -> { ok: true, chips: [...] }
// Public chips from everyone, plus the signed-in user's own private chips.
export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    return NextResponse.json({ ok: true, chips: await listVisibleChips(user?.id ?? null) });
  } catch (err) {
    console.error("GET /api/chips failed:", err);
    return NextResponse.json({ ok: true, chips: [] });
  }
}

// POST /api/chips  <CompiledChip & { visibility }>. Requires sign-in.
// Visibility defaults to private when missing or invalid.
export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Sign in to save chips." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.id || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "Chip is missing an id or name" }, { status: 400 });
  }
  if (typeof body.id !== "string" || !VALID_ID.test(body.id)) {
    return NextResponse.json({ ok: false, error: "Invalid chip id" }, { status: 400 });
  }
  if (!Array.isArray(body.gates) || !Array.isArray(body.outputSources)) {
    return NextResponse.json({ ok: false, error: "Invalid chip" }, { status: 400 });
  }

  // Ownership comes from the session, never from the request body.
  const { ownerId, ownerName, mine, visibility: _visibility, ...compiled } = body;
  if (JSON.stringify(compiled).length > MAX_CHIP_CHARS) {
    return NextResponse.json({ ok: false, error: "Chip is too large." }, { status: 413 });
  }
  const visibility = VISIBILITIES.includes(body.visibility) ? body.visibility : "private";

  try {
    const saved = await saveChip({
      id: body.id,
      ownerId: user.id,
      ownerName: user.name || "",
      visibility,
      name: body.name.trim().slice(0, 100),
      data: compiled,
    });
    // Never overwrite a chip that belongs to someone else.
    if (!saved) {
      return NextResponse.json({ ok: false, error: "A chip with this id already exists." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, visibility });
  } catch (err) {
    console.error("POST /api/chips failed:", err);
    return NextResponse.json({ ok: false, error: "Failed to save chip" }, { status: 500 });
  }
}

// PATCH /api/chips  { id, visibility }: owner only.
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
    const outcome = await setChipVisibility({ id: body.id, ownerId: user.id, visibility: body.visibility });
    if (outcome === "not_found") return NextResponse.json({ ok: false, error: "Chip not found." }, { status: 404 });
    if (outcome === "forbidden") {
      return NextResponse.json({ ok: false, error: "You can only change your own chips." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, visibility: body.visibility });
  } catch (err) {
    console.error("PATCH /api/chips failed:", err);
    return NextResponse.json({ ok: false, error: "Failed to update chip" }, { status: 500 });
  }
}
