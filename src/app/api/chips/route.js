import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Same local-filesystem caveat as app/api/projects/route.js — fine for local
// dev / a self-hosted server, not for a read-only serverless filesystem.
const CHIPS_DIR = path.join(process.cwd(), "data", "chips");

// GET /api/chips  -> { ok: true, chips: CompiledChip[] }
// No search yet — this always returns everything; filtering is a stub for now.
export async function GET() {
  try {
    await fs.mkdir(CHIPS_DIR, { recursive: true });
    const files = await fs.readdir(CHIPS_DIR);
    const chips = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const text = await fs.readFile(path.join(CHIPS_DIR, f), "utf8");
          return JSON.parse(text);
        })
    );
    chips.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ ok: true, chips });
  } catch {
    return NextResponse.json({ ok: true, chips: [] });
  }
}

// POST /api/chips  <CompiledChip>
export async function POST(request) {
  let chip;
  try {
    chip = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!chip?.id || !chip?.name) {
    return NextResponse.json({ ok: false, error: "Chip is missing an id or name" }, { status: 400 });
  }

  try {
    await fs.mkdir(CHIPS_DIR, { recursive: true });
    await fs.writeFile(path.join(CHIPS_DIR, `${chip.id}.json`), JSON.stringify(chip, null, 2), "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save chip" }, { status: 500 });
  }
}