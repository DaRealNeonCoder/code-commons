import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReactDemoDataMarkup,
  createReactDemoNonce,
  deserializeReactDemoArtifacts,
  isValidRunnerMessage,
  MAX_ACTIVE_REACT_DEMOS,
  MAX_REACT_DEMO_CODE,
  MAX_REACT_DEMO_COMPILED,
  MAX_REACT_DEMO_LESSON_PAYLOAD,
  MAX_REACT_DEMOS,
  REACT_DEMO_IFRAME_SANDBOX,
  REACT_DEMO_RENDER_TIMEOUT_MS,
  REACT_DEMO_RUNNER_ORIGIN,
  serializeReactDemoArtifacts,
  validateReactDemoDrafts,
} from "../src/lib/reactDemo.js";
import { compileReactDemo } from "../ccreact/src/compiler.js";

test("published React demo data is serialized without executable MDX", () => {
  const data = serializeReactDemoArtifacts([{ title: "counter", compiled: "globalThis.__CCREACT_DEMO__ = function Demo() {};" }]);
  const markup = buildReactDemoDataMarkup([{ title: "counter", compiled: "globalThis.__CCREACT_DEMO__ = function Demo() {};" }]);
  assert.match(markup, /^\n\n<ReactDemo data="[A-Za-z0-9_-]+" \/>$/);
  assert.deepEqual(deserializeReactDemoArtifacts(data), [{ title: "counter", compiled: "globalThis.__CCREACT_DEMO__ = function Demo() {};" }]);
  assert.deepEqual(deserializeReactDemoArtifacts("not-json"), []);
});

test("draft limits are enforced independently of editor controls", () => {
  assert.equal(validateReactDemoDrafts([{ title: "x", code: "function Demo() {}" }]), null);
  assert.match(validateReactDemoDrafts([{ title: "x", code: "x".repeat(MAX_REACT_DEMO_CODE + 1) }]), /too large/i);
  assert.match(validateReactDemoDrafts(Array.from({ length: MAX_REACT_DEMOS + 1 }, () => ({ title: "", code: "" }))), /too many/i);
});

test("server compiler rejects imports outside the pinned allowlist", async () => {
  const options = { maxSourceChars: MAX_REACT_DEMO_CODE, maxCompiledChars: MAX_REACT_DEMO_COMPILED };
  await compileReactDemo('import React from "react"; function Demo() { return <button>ok</button>; }', options);
  for (const specifier of ["./local.js", "/absolute.js", "https://evil.example/x.js", "node:fs", "fs", "some-package"]) {
    await assert.rejects(() => compileReactDemo(`import value from ${JSON.stringify(specifier)}; function Demo() { return value; }`, options), /not allowed/i);
  }
});

test("server compiler enforces source, compiled, and component validation", async () => {
  await assert.rejects(() => compileReactDemo("x".repeat(MAX_REACT_DEMO_CODE + 1), { maxSourceChars: MAX_REACT_DEMO_CODE }), /too large/i);
  await assert.rejects(() => compileReactDemo("const value = 1;", { maxSourceChars: MAX_REACT_DEMO_CODE }), /Demo \(or App\)/);
  await assert.rejects(() => compileReactDemo("function Demo() {}", { maxSourceChars: MAX_REACT_DEMO_CODE, maxCompiledChars: 1 }), /too large/i);
});

test("runner boundary has explicit limits and sandbox", () => {
  assert.equal(REACT_DEMO_IFRAME_SANDBOX, "allow-scripts");
  assert.equal(REACT_DEMO_RUNNER_ORIGIN, "https://code-commons-ccreact.vercel.app");
  assert.equal(MAX_REACT_DEMOS, 20);
  assert.equal(MAX_ACTIVE_REACT_DEMOS, 6);
  assert.equal(REACT_DEMO_RENDER_TIMEOUT_MS > 0, true);
  assert.equal(MAX_REACT_DEMO_LESSON_PAYLOAD > MAX_REACT_DEMO_COMPILED, true);
});

test("runner messages require the exact frame and nonce", () => {
  const frame = {};
  const nonce = createReactDemoNonce();
  const valid = { source: frame, origin: "null", data: { type: "react-demo:rendered", nonce } };
  assert.equal(isValidRunnerMessage(valid, frame, nonce), true);
  assert.equal(isValidRunnerMessage({ ...valid, source: {} }, frame, nonce), false);
  assert.equal(isValidRunnerMessage({ ...valid, origin: "https://evil.example" }, frame, nonce), false);
  assert.equal(isValidRunnerMessage({ ...valid, data: { ...valid.data, nonce: "wrong" } }, frame, nonce), false);
});
