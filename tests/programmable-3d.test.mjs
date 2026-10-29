import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROGRAMMABLE_CPU,
  PROGRAMMABLE_3D_MODE,
  defaultProgrammableFiles,
  normalizeProgrammableFiles,
  primaryFragmentSource,
  validateFileName,
  validateProgrammableFiles,
  validateShaderProjectData,
} from "../src/lib/shaders/programmable3d.js";
import { createProgrammableRunnerDocument } from "../src/lib/shaders/programmable3dRunner.js";

test("the programmable starter contains a complete three-file project", () => {
  const files = defaultProgrammableFiles();
  assert.equal(validateProgrammableFiles(files), null);
  assert.match(files["scene.js"], /function setup\(engine\)/);
  assert.match(files["vertex.vert"], /u_projection/);
  assert.match(files["fragment.frag"], /gl_FragColor/);
});

test("legacy cpu/vertex/fragment projects are read as named files", () => {
  const files = normalizeProgrammableFiles({ cpu: DEFAULT_PROGRAMMABLE_CPU });
  assert.equal(files["scene.js"], DEFAULT_PROGRAMMABLE_CPU);
  assert.ok(files["vertex.vert"].length > 0);
  assert.ok(files["fragment.frag"].length > 0);
  assert.equal(validateProgrammableFiles({ cpu: DEFAULT_PROGRAMMABLE_CPU }), null);
});

test("programmable validation rejects imports and oversized sources", () => {
  const files = defaultProgrammableFiles();
  assert.match(validateProgrammableFiles({ ...files, "scene.js": "import x from 'x';\nfunction setup(engine) {}" }), /cannot use import/);
  assert.match(validateProgrammableFiles({ ...files, "helpers.js": "export const x = 1;" }), /cannot use import or export/);
  assert.match(validateProgrammableFiles({ ...files, "vertex.vert": "x".repeat(20_001) }), /vertex.vert is too long/);
});

test("projects may hold several scripts and shaders", () => {
  const files = {
    ...defaultProgrammableFiles(),
    "lib/math.js": "module.exports = { twice: (x) => x * 2 };",
    "shaders/glow.vert": defaultProgrammableFiles()["vertex.vert"],
    "shaders/glow.frag": defaultProgrammableFiles()["fragment.frag"],
  };
  assert.equal(validateProgrammableFiles(files), null);
  assert.equal(validateProgrammableFiles({ ...files, "scene.js": "function setup(engine) { require('./lib/math.js'); }" }), null);
});

test("projects need an entry script, a vertex shader and a fragment shader", () => {
  const files = defaultProgrammableFiles();
  const { "scene.js": _entry, ...withoutEntry } = files;
  assert.match(validateProgrammableFiles(withoutEntry), /scene.js is required/);
  assert.match(validateProgrammableFiles({ "scene.js": files["scene.js"], "fragment.frag": files["fragment.frag"] }), /vertex shader/);
  assert.match(validateProgrammableFiles({ "scene.js": files["scene.js"], "vertex.vert": files["vertex.vert"] }), /fragment shader/);
  assert.match(validateProgrammableFiles({ ...files, "fragment.frag": "   " }), /must not be empty/);
  assert.match(validateProgrammableFiles({ ...files, "notes.txt": "hi" }), /must end in/);
});

test("file names are restricted to safe relative paths", () => {
  const existing = defaultProgrammableFiles();
  assert.equal(validateFileName("shaders/glow.frag", existing), null);
  assert.equal(validateFileName("lib/helpers.js", existing), null);
  assert.match(validateFileName("../escape.js", existing), /Use letters/);
  assert.match(validateFileName("/abs.js", existing), /Use letters/);
  assert.match(validateFileName("scene.js", existing), /already exists/);
  assert.match(validateFileName("notes.txt", existing), /Use letters/);
});

test("the first fragment shader supplies the lesson starter code", () => {
  assert.equal(primaryFragmentSource(defaultProgrammableFiles()), defaultProgrammableFiles()["fragment.frag"]);
  assert.equal(primaryFragmentSource({ cpu: DEFAULT_PROGRAMMABLE_CPU }), defaultProgrammableFiles()["fragment.frag"]);
});

test("fragment projects remain valid without a mode discriminator", () => {
  assert.equal(validateShaderProjectData({ code: "void main() {}" }), null);
  assert.equal(validateShaderProjectData({ mode: "fragment", code: "void main() {}" }), null);
  assert.equal(validateShaderProjectData({ mode: PROGRAMMABLE_3D_MODE, files: defaultProgrammableFiles() }), null);
  assert.match(validateShaderProjectData({ mode: PROGRAMMABLE_3D_MODE, files: {} }), /scene.js is required/);
  assert.match(validateShaderProjectData({ mode: PROGRAMMABLE_3D_MODE, files: null }), /files are required/);
});

test("programmable runner announces boot after installing its init listener", () => {
  const source = createProgrammableRunnerDocument();
  const listener = source.indexOf('window.addEventListener("message"');
  const boot = source.indexOf('window.parent.postMessage({type:"programmable-3d:boot"}');
  assert.ok(listener >= 0);
  assert.ok(boot > listener, "boot must be announced after the init listener exists");
  assert.match(source, /typeof ResizeObserver === "function"/);
  assert.doesNotMatch(source, /report\("programmable-3d:ready"\); requestAnimationFrame/);
});

test("runner registers every project script and resolves shaders by file name", () => {
  const source = createProgrammableRunnerDocument();
  assert.match(source, /window\.__programmableDefine = function/);
  assert.match(source, /function requireModule\(request\)/);
  assert.match(source, /function defaultShader\(extension\)/);
  assert.match(source, /ENTRY = "scene\.js"/);
});
