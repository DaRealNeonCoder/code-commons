import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { buildProjectMdx, parseProjectMdx, slugify } from "@/lib/circuits/projectFile";

// NOTE: this stores projects as plain files on the server's local disk.
// That's fine for local dev / a self-hosted Node server, but it will NOT
// persist on serverless hosts (e.g. Vercel) whose filesystem is read-only
// in production. Swap the two functions below for a database call when
// that matters.
const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

// GET /api/projects?name=project
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = slugify(searchParams.get("name"));
  const filePath = path.join(PROJECTS_DIR, `${name}.mdx`);

  try {
    const text = await fs.readFile(filePath, "utf8");
    const project = parseProjectMdx(text);
    return NextResponse.json({ ok: true, project });
  } catch {
    return NextResponse.json({ ok: false, error: "No saved project found" }, { status: 404 });
  }
}

// POST /api/projects  { name?, components, connections, chips }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { name = "project", components = [], connections = [], chips = {} } = body ?? {};
  const slug = slugify(name);

  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    const mdx = buildProjectMdx({ name, components, connections, chips });
    await fs.writeFile(path.join(PROJECTS_DIR, `${slug}.mdx`), mdx, "utf8");
    return NextResponse.json({ ok: true, name: slug });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save project" }, { status: 500 });
  }
}