import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReactDemoDocument,
  hasReactDemoCode,
  normalizeReactDemos,
  REACT_DEMO_IFRAME_SANDBOX,
  REACT_DEMO_PUBLISH_ERROR,
} from "../src/lib/reactDemo.js";

test("React demo code is detected for the publication guard", () => {
  assert.equal(hasReactDemoCode([]), false);
  assert.equal(hasReactDemoCode([{ title: "empty", code: "  " }]), false);
  assert.equal(hasReactDemoCode([{ title: "counter", code: "function Demo() {}" }]), true);
});

test("React demo drafts are normalized and capped", () => {
  const demos = normalizeReactDemos([{ title: 42, code: "x".repeat(25_000) }]);
  assert.deepEqual(demos, [{ title: "", code: "x".repeat(20_000) }]);
});

test("sandbox document escapes script-breaking demo text and advertises its boundary", () => {
  const source = buildReactDemoDocument('function Demo() { return "</script>"; }');
  assert.equal(REACT_DEMO_IFRAME_SANDBOX, "allow-scripts");
  assert.match(source, /connect-src 'none'/);
  assert.doesNotMatch(source, /<\/script>"/);
  assert.equal(source.includes("\\u003c/script\\u003e"), true);
});

test("publication explanation is explicit", () => {
  assert.match(REACT_DEMO_PUBLISH_ERROR, /not yet supported in published lessons/);
  assert.match(REACT_DEMO_PUBLISH_ERROR, /security validation/);
});
