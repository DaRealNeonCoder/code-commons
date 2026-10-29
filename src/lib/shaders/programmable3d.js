// Contract shared by the editor, persistence API, and the isolated WebGL
// runner. The fragment-only shader path deliberately does not depend on this
// module, so old projects keep their small ShaderToy-style workflow.
//
// A programmable project is a map of named source files. The file's kind comes
// from its extension: `.js` scripts run on the host side, `.vert` files are
// vertex shaders, and `.frag` files are fragment shaders. `scene.js` is the
// entry point and must define setup(engine). Other scripts load each other with
// require("./name.js"), and materials pick shaders by name.

export const PROGRAMMABLE_3D_MODE = "programmable-3d";
export const FRAGMENT_SHADER_MODE = "fragment";
export const PROGRAMMABLE_ENTRY = "scene.js";

export const PROGRAMMABLE_FILE_KINDS = Object.freeze([
  Object.freeze({ extension: ".js", kind: "script", label: "Script", limit: 30_000 }),
  Object.freeze({ extension: ".vert", kind: "vertex", label: "Vertex shader", limit: 20_000 }),
  Object.freeze({ extension: ".frag", kind: "fragment", label: "Fragment shader", limit: 20_000 }),
]);

export const PROGRAMMABLE_3D_LIMITS = Object.freeze({
  files: 24,
  total: 150_000,
  nameLength: 64,
});

// Projects saved before multi-file support used these three fixed keys.
const LEGACY_KEYS = ["cpu", "vertex", "fragment"];

export const DEFAULT_PROGRAMMABLE_VERTEX = `attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec3 v_worldPosition;

void main() {
  vec4 worldPosition = u_model * vec4(a_position, 1.0);
  v_worldPosition = worldPosition.xyz;
  v_normal = mat3(u_model) * a_normal;
  v_uv = a_uv;
  gl_Position = u_projection * u_view * worldPosition;
}`;

export const DEFAULT_PROGRAMMABLE_FRAGMENT = `precision mediump float;

uniform vec3 u_color;
uniform vec3 u_cameraPosition;
uniform float u_time;

varying vec3 v_normal;
varying vec2 v_uv;
varying vec3 v_worldPosition;

void main() {
  vec3 normal = normalize(v_normal);
  vec3 light = normalize(vec3(-0.4, 0.8, 0.6));
  float diffuse = max(dot(normal, light), 0.0);
  float pulse = 0.08 * sin(u_time * 2.0 + v_uv.x * 6.2831);
  vec3 color = u_color * (0.22 + diffuse * 0.78) + pulse;
  gl_FragColor = vec4(color, 1.0);
}`;

export const DEFAULT_PROGRAMMABLE_CPU = `// The script runs in an isolated browser frame.
// Define setup(engine) and optionally return { update(frame) { ... } }.
// Other project scripts load with require("./helpers.js").
function setup(engine) {
  const cube = engine.scene.add({
    geometry: engine.geometry.cube(),
    material: engine.material({
      uniforms: { u_color: [0.35, 0.65, 1.0] },
    }),
    position: [0, 0, 0],
  });

  engine.camera.position.set(0, 0, 4.5);

  return {
    update({ time, delta }) {
      cube.rotation.y += delta * 0.9;
      cube.rotation.x = Math.sin(time * 0.8) * 0.25;
    },
  };
}`;

export function fileKindOf(name) {
  if (typeof name !== "string") return null;
  return PROGRAMMABLE_FILE_KINDS.find((kind) => name.endsWith(kind.extension)) ?? null;
}

export function defaultProgrammableFiles() {
  return {
    [PROGRAMMABLE_ENTRY]: DEFAULT_PROGRAMMABLE_CPU,
    "vertex.vert": DEFAULT_PROGRAMMABLE_VERTEX,
    "fragment.frag": DEFAULT_PROGRAMMABLE_FRAGMENT,
  };
}

function isLegacyFileShape(value) {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => LEGACY_KEYS.includes(key));
}

// Accepts both the current name-to-source map and the legacy three-key shape,
// and always returns a map with the entry script present.
export function normalizeProgrammableFiles(value) {
  const defaults = defaultProgrammableFiles();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  if (isLegacyFileShape(value)) {
    return {
      [PROGRAMMABLE_ENTRY]: typeof value.cpu === "string" ? value.cpu : defaults[PROGRAMMABLE_ENTRY],
      "vertex.vert": typeof value.vertex === "string" ? value.vertex : defaults["vertex.vert"],
      "fragment.frag": typeof value.fragment === "string" ? value.fragment : defaults["fragment.frag"],
    };
  }
  const files = {};
  for (const [name, source] of Object.entries(value)) {
    if (typeof source === "string") files[name] = source;
  }
  if (!(PROGRAMMABLE_ENTRY in files)) files[PROGRAMMABLE_ENTRY] = defaults[PROGRAMMABLE_ENTRY];
  return files;
}

// The first file of a kind, in project order. Materials that do not name a
// shader use these.
export function defaultShaderName(files, extension) {
  return Object.keys(files).find((name) => name.endsWith(extension)) ?? null;
}

// Shared by the editor's "add file" form and the save validation.
export function validateFileName(name, existing = {}) {
  if (typeof name !== "string" || name.length === 0) return "Enter a file name.";
  if (name.length > PROGRAMMABLE_3D_LIMITS.nameLength) return "File names are too long.";
  if (!/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.(js|vert|frag)$/.test(name)) {
    return "Use letters, numbers, - and _, optional folders with /, and a .js, .vert or .frag extension.";
  }
  if (Object.prototype.hasOwnProperty.call(existing, name)) return `${name} already exists.`;
  return null;
}

export function validateProgrammableFiles(value, { requireSetup = true } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Programmable shader files are required.";
  }
  if (!Object.values(value).every((source) => typeof source === "string")) {
    return "Every project file must be text.";
  }
  // Legacy projects may omit fields; normalizeProgrammableFiles fills those in.
  if (!isLegacyFileShape(value) && !(PROGRAMMABLE_ENTRY in value)) {
    return `${PROGRAMMABLE_ENTRY} is required.`;
  }

  const files = normalizeProgrammableFiles(value);
  const names = Object.keys(files);
  if (names.length > PROGRAMMABLE_3D_LIMITS.files) return "The programmable shader project has too many files.";

  let total = 0;
  for (const name of names) {
    const kind = fileKindOf(name);
    if (!kind) return `${name} must end in .js, .vert or .frag.`;
    if (name !== name.trim() || validateFileName(name, {}) !== null) {
      return `${name} is not a valid file name.`;
    }
    if (files[name].length > kind.limit) return `${name} is too long (limit ${kind.limit} characters).`;
    if (kind.kind !== "script" && !files[name].trim()) return `${name} must not be empty.`;
    total += files[name].length;
  }
  if (total > PROGRAMMABLE_3D_LIMITS.total) return "The programmable shader project is too large.";
  if (!names.some((name) => fileKindOf(name).kind === "vertex")) return "At least one vertex shader (.vert) is required.";
  if (!names.some((name) => fileKindOf(name).kind === "fragment")) return "At least one fragment shader (.frag) is required.";

  for (const name of names) {
    if (fileKindOf(name).kind !== "script") continue;
    const source = files[name];
    if (/\b(?:import|export)\s+|\bimport\s*\(/.test(source)) {
      return `${name} cannot use import or export. Use require("./file.js") to load project scripts.`;
    }
  }
  if (requireSetup && !/\bfunction\s+setup\s*\(/.test(files[PROGRAMMABLE_ENTRY])) {
    return `${PROGRAMMABLE_ENTRY} must define setup(engine).`;
  }
  return null;
}

export function primaryFragmentSource(value) {
  const files = normalizeProgrammableFiles(value);
  const name = defaultShaderName(files, ".frag");
  return name ? files[name] : "";
}

export function validateShaderProjectData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "Invalid shader project data.";
  if (data.mode == null || data.mode === FRAGMENT_SHADER_MODE) return null;
  if (data.mode !== PROGRAMMABLE_3D_MODE) return "Unknown shader project mode.";
  return validateProgrammableFiles(data.files);
}

export function createProgrammableNonce() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
