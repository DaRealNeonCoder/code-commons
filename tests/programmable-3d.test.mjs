import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROGRAMMABLE_CPU,
  PROGRAMMABLE_3D_MODE,
  defaultProgrammableFiles,
  normalizeProgrammableFiles,
  validateProgrammableFiles,
  validateShaderProjectData,
} from "../src/lib/shaders/programmable3d.js";

test("the programmable starter contains a complete three-file project", () => {
  const files = defaultProgrammableFiles();
  assert.equal(validateProgrammableFiles(files), null);
  assert.match(files.cpu, /function setup\(engine\)/);
  assert.match(files.vertex, /u_projection/);
  assert.match(files.fragment, /gl_FragColor/);
});

test("missing optional files are filled with safe defaults", () => {
  const files = normalizeProgrammableFiles({ cpu: DEFAULT_PROGRAMMABLE_CPU });
  assert.ok(files.vertex.length > 0);
  assert.ok(files.fragment.length > 0);
});

test("programmable validation rejects imports and oversized sources", () => {
  const files = defaultProgrammableFiles();
  assert.match(validateProgrammableFiles({ ...files, cpu: "import x from 'x';\nfunction setup(engine) {}" }), /cannot import/);
  assert.match(validateProgrammableFiles({ ...files, vertex: "x".repeat(20_001) }), /vertex source is too long/);
});

test("fragment projects remain valid without a mode discriminator", () => {
  assert.equal(validateShaderProjectData({ code: "void main() {}" }), null);
  assert.equal(validateShaderProjectData({ mode: "fragment", code: "void main() {}" }), null);
  assert.equal(validateShaderProjectData({ mode: PROGRAMMABLE_3D_MODE, files: defaultProgrammableFiles() }), null);
  assert.match(validateShaderProjectData({ mode: PROGRAMMABLE_3D_MODE, files: {} }), /source files are required/);
});
