import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReactCodeLoopResult,
  REACT_CODE_LOOP_STATUS,
} from "./reactCodeLoop.js";
import { MAX_REACT_DEMO_COMPILED } from "./reactDemo.js";

test("React code loop accepts compiler strings and result objects", () => {
  assert.equal(normalizeReactCodeLoopResult("compiled"), "compiled");
  assert.equal(normalizeReactCodeLoopResult({ compiled: "compiled" }), "compiled");
});

test("React code loop rejects unusable compiler results", () => {
  assert.throws(() => normalizeReactCodeLoopResult(""), /no runnable/i);
  assert.throws(() => normalizeReactCodeLoopResult({}), /no runnable/i);
  assert.throws(() => normalizeReactCodeLoopResult("x".repeat(MAX_REACT_DEMO_COMPILED + 1)), /too large/i);
});

test("React code loop exposes stable lifecycle statuses", () => {
  assert.deepEqual(Object.values(REACT_CODE_LOOP_STATUS), ["idle", "compiling", "ready", "error"]);
});
