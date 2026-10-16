import test from "node:test";
import assert from "node:assert/strict";
import { compileReactDemo, REACT_DEMO_IMPORT_ALLOWLIST } from "../src/compiler.js";

const options = { maxSourceChars: 20_000, maxCompiledChars: 120_000 };

test("compiler accepts only the explicit React allowlist", async () => {
  assert.deepEqual(REACT_DEMO_IMPORT_ALLOWLIST, ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]);
  const output = await compileReactDemo('import React, { useState } from "react"; function Demo() { return <button>{useState ? "ok" : "no"}</button>; }', options);
  assert.match(output, /__CCREACT_DEMO__/);
  await assert.rejects(() => compileReactDemo('import x from "./secret.js"; function Demo() {}', options), /not allowed/i);
  await assert.rejects(() => compileReactDemo('import x from "fs"; function Demo() {}', options), /not allowed/i);
  await assert.rejects(() => compileReactDemo('import x from "https://example.com/x.js"; function Demo() {}', options), /not allowed/i);
});

test("compiler rejects missing components and source limits", async () => {
  await assert.rejects(() => compileReactDemo("const nope = 1;", options), /Demo \(or App\)/);
  await assert.rejects(() => compileReactDemo("function Demo() {}", { ...options, maxSourceChars: 5 }), /too large/i);
});
