// Contract shared by the editor, persistence API, and the isolated WebGL
// runner. The fragment-only shader path deliberately does not depend on this
// module, so old projects keep their small ShaderToy-style workflow.

export const PROGRAMMABLE_3D_MODE = "programmable-3d";
export const FRAGMENT_SHADER_MODE = "fragment";

export const PROGRAMMABLE_3D_LIMITS = Object.freeze({
  cpu: 30_000,
  vertex: 20_000,
  fragment: 20_000,
  total: 68_000,
});

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

export const DEFAULT_PROGRAMMABLE_CPU = `// The CPU script runs in an isolated browser frame.
// Define setup(engine) and optionally return { update(frame) { ... } }.
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

export function defaultProgrammableFiles() {
  return {
    cpu: DEFAULT_PROGRAMMABLE_CPU,
    vertex: DEFAULT_PROGRAMMABLE_VERTEX,
    fragment: DEFAULT_PROGRAMMABLE_FRAGMENT,
  };
}

export function normalizeProgrammableFiles(value) {
  const defaults = defaultProgrammableFiles();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  return {
    cpu: typeof value.cpu === "string" ? value.cpu : defaults.cpu,
    vertex: typeof value.vertex === "string" ? value.vertex : defaults.vertex,
    fragment: typeof value.fragment === "string" ? value.fragment : defaults.fragment,
  };
}

export function validateProgrammableFiles(value, { requireSetup = true } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Programmable shader files are required.";
  }
  if (!["cpu", "vertex", "fragment"].every((name) => typeof value[name] === "string")) {
    return "CPU, vertex, and fragment source files are required.";
  }
  const files = normalizeProgrammableFiles(value);
  for (const [name, limit] of Object.entries(PROGRAMMABLE_3D_LIMITS)) {
    if (name === "total") continue;
    if (files[name].length > limit) return `${name} source is too long.`;
  }
  if (files.cpu.length + files.vertex.length + files.fragment.length > PROGRAMMABLE_3D_LIMITS.total) {
    return "The programmable shader project is too large.";
  }
  if (requireSetup && !/\bfunction\s+setup\s*\(/.test(files.cpu)) {
    return "CPU code must define setup(engine).";
  }
  if (/\b(?:import|export)\s+|\b(?:require|import)\s*\(/.test(files.cpu)) {
    return "CPU code cannot import modules or use require.";
  }
  if (!files.vertex.trim() || !files.fragment.trim()) return "Vertex and fragment shaders are required.";
  return null;
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
