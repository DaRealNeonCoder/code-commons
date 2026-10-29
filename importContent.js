// One-off: copies the on-disk content into the database.
//
//   npm run db:push
//   npx tsx --env-file=.env.local importContent.js
// 
// Idempotent: file names become slugs (URLs stay the same) and re-running updates
// the same rows. Official content is owned by "system". Courses that came from a
// creator project (they carry a projectId) go to that project's owner instead, so
// the author can keep editing them.
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "./src/lib/frontmatter.js";
import { importLessonsDir } from "./src/lib/db/importLessons";
import { SYSTEM_OWNER } from "./src/lib/db/lessons";
import { puzzleStore, shaderStore, circuitStore } from "./src/lib/db/stores";
import { saveCourse } from "./src/lib/db/courses";
import { saveChip } from "./src/lib/db/chips";
import { getProject } from "./src/lib/creatorProjects";
import { parseCircuit, EMPTY_CIRCUIT } from "./src/lib/circuits/circuitData";
import { getPuzzlePorts, getPuzzleTests, validatePuzzleCircuit } from "./src/lib/circuits/puzzle";
import { getShaderPuzzle } from "./src/lib/shaders/puzzle";
import { normalizeMathQuiz } from "./src/lib/mathQuiz";

const ROOT = process.cwd();
const str = (v) => (typeof v === "string" ? v : "");
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

function listFiles(dir, ext) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(ext)).sort().map((f) => ({ file: f, path: path.join(full, f) }));
}

// Fields every lesson-shaped type shares.
function common(data, content, file) {
  return {
    ownerId: SYSTEM_OWNER,
    slug: file.replace(/\.mdx$/, ""),
    title: str(data.title).trim() || file.replace(/\.mdx$/, ""),
    summary: str(data.summary).trim(),
    order: Number.isInteger(data.order) ? data.order : null,
    available: data.available !== false,
    difficulty: str(data.difficulty).trim() || "beginner",
    areas: arr(data.areas),
    topics: arr(data.topics),
    tags: arr(data.tags),
    languages: arr(data.languages),
    body: content.replace(/^\s*\n/, "").trimEnd(),
  };
}

function normalizeTestCases(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((t) => t && t.expected !== undefined && t.expected !== null)
    .map((t) => ({ input: String(t.input ?? ""), expected: String(t.expected), hidden: Boolean(t.hidden) }));
}

function report(kind, file, result) {
  console.log(`${result.ok ? "ok  " : "FAIL"} ${kind.padEnd(8)} ${file}${result.ok ? "" : `  (${result.error})`}`);
}

async function importMdx(kind, dir, store, payloadFor) {
  for (const { file, path: p } of listFiles(dir, ".mdx")) {
    const { data, content } = parseFrontmatter(fs.readFileSync(p, "utf8"));
    let payload;
    try {
      payload = payloadFor(data);
    } catch (error) {
      report(kind, file, { ok: false, error: error.message });
      continue;
    }
    const result = await store.save({ ...common(data, content, file), payload });
    report(kind, file, result);
  }
}

function puzzlePayload(data) {
  const kind = data.kind == null ? "coding" : data.kind;
  if (kind === "coding") {
    return {
      kind,
      starterCode: str(data.starterCode),
      testCases: normalizeTestCases(data.testCases),
      quizConfig: null,
    };
  }
  if (kind === "math-quiz") {
    const quizConfig = normalizeMathQuiz(data.mathQuiz);
    if (!quizConfig) throw new Error("invalid math quiz configuration");
    return { kind, starterCode: "", testCases: [], quizConfig };
  }
  throw new Error(`unsupported puzzle kind: ${kind}`);
}

async function main() {
  console.log("-- lessons");
  for (const r of await importLessonsDir()) report("lesson", r.file, r);

  await importMdx("puzzle", "content/puzzles", puzzleStore, puzzlePayload);

  await importMdx("shader", "content/shaders", shaderStore, (d) => ({
    starterCode: str(d.starterCode),
    puzzleConfig: d.shaderPuzzle == null ? null : getShaderPuzzle(d.shaderPuzzle),
  }));

  await importMdx("circuit", "content/circuits", circuitStore, (d) => {
    const starterCircuit = parseCircuit(d.starterCircuit) ?? EMPTY_CIRCUIT;
    const puzzlePorts = d.puzzlePorts == null ? null : getPuzzlePorts(d.puzzlePorts, starterCircuit);
    const testCases = puzzlePorts ? getPuzzleTests(d.testCases, puzzlePorts) : [];
    if (puzzlePorts) validatePuzzleCircuit(starterCircuit, puzzlePorts);
    return { starterCircuit, puzzlePorts, testCases };
  });

  for (const { file, path: p } of listFiles("content/courses", ".json")) {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    let ownerId = SYSTEM_OWNER;
    let projectId = null;
    if (typeof data.projectId === "string") {
      const project = await getProject(data.projectId);
      if (project?.type === "course") {
        ownerId = project.userId;
        projectId = project.id;
      }
    }
    const result = await saveCourse({
      ownerId,
      projectId,
      slug: file.replace(/\.json$/, ""),
      title: str(data.title) || file,
      summary: str(data.summary),
      lessons: arr(data.lessons),
      courses: arr(data.courses),
    });
    report("course", file, result);
  }

  for (const { file, path: p } of listFiles("data/chips", ".json")) {
    try {
      const { ownerId, ownerName, visibility, mine, ...compiled } = JSON.parse(fs.readFileSync(p, "utf8"));
      const saved = await saveChip({
        id: compiled.id,
        ownerId: ownerId || SYSTEM_OWNER,
        ownerName: ownerName || "",
        visibility: visibility === "private" ? "private" : "public", // legacy chips were public
        name: String(compiled.name || compiled.id),
        data: compiled,
      });
      report("chip", file, { ok: saved, error: "id taken by another owner" });
    } catch (err) {
      report("chip", file, { ok: false, error: err.message });
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
