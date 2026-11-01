import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCheckDocument,
  buildPreviewDocument,
  getClientWebInfo,
  normalizeWebConfig,
  WEB_CHECK_SOURCE,
} from "../src/lib/web/webPuzzle.js";

const starter = {
  version: 1,
  files: {
    html: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<title>Practice</title>\n</head>\n<body>\n<h1>Hi</h1>\n</body>\n</html>",
    css: "h1 { color: red; }",
    js: "const x = 1;",
  },
  checks: [{ type: "text", selector: "h1", text: "Hi" }],
  solution: { html: "<h1>Hi</h1>", css: "", js: "" },
};

test("normalizeWebConfig accepts a valid config and fills defaults", () => {
  const config = normalizeWebConfig({ ...starter, files: { html: "<p>x</p>" } });
  assert.deepEqual(config.files, { html: "<p>x</p>", css: "", js: "" });
  assert.equal(config.checks[0].label, 'h1 says "Hi"');
});

test("normalizeWebConfig rejects unknown check types and missing fields", () => {
  assert.equal(normalizeWebConfig({ ...starter, checks: [{ type: "eval", code: "1" }] }), null);
  assert.equal(normalizeWebConfig({ ...starter, checks: [{ type: "text", selector: "h1" }] }), null);
  assert.equal(normalizeWebConfig({ ...starter, checks: [{ type: "count", selector: "li", count: -1 }] }), null);
  assert.equal(normalizeWebConfig({ ...starter, checks: [] }), null);
});

test("normalizeWebConfig rejects the wrong version and oversized files", () => {
  assert.equal(normalizeWebConfig({ ...starter, version: 2 }), null);
  assert.equal(normalizeWebConfig({ ...starter, files: { html: "x".repeat(20_001) } }), null);
  assert.equal(normalizeWebConfig(null), null);
});

test("getClientWebInfo removes the solution", () => {
  const info = getClientWebInfo(starter);
  assert.equal("solution" in info, false);
  assert.deepEqual(info.checks[0], { type: "text", label: 'h1 says "Hi"', selector: "h1", text: "Hi" });
});

test("buildPreviewDocument places CSS in the head and JavaScript at the end of the body", () => {
  const doc = buildPreviewDocument({ html: "<html><head></head><body><p>a</p></body></html>", css: "p{}", js: "var b = 2;" });
  const headEnd = doc.indexOf("</head>");
  const styleAt = doc.indexOf("<style>\np{}");
  const scriptAt = doc.indexOf("<script>\nvar b = 2;");
  assert.ok(styleAt > -1 && styleAt < headEnd, "style belongs before </head>");
  assert.ok(scriptAt > doc.indexOf("<p>a</p>") && scriptAt < doc.indexOf("</body>"), "script belongs before </body>");
});

test("buildPreviewDocument still works when the learner omits head and body", () => {
  const doc = buildPreviewDocument({ html: "<p>bare</p>", css: "p{}", js: "" });
  assert.ok(doc.startsWith("<style>"));
  assert.ok(doc.includes("<p>bare</p>"));
});

test("buildCheckDocument serializes checks with < escaped so they cannot close the script tag", () => {
  const checks = [{ type: "script", label: "x", expression: "'</script><b>'", expected: "</script>" }];
  const doc = buildCheckDocument({ files: { html: "<p>x</p>", css: "", js: "" }, checks });
  assert.ok(doc.includes(WEB_CHECK_SOURCE));
  assert.ok(!doc.includes("'</script><b>'"), "raw expression must not appear unescaped");
  assert.ok(doc.includes("\\u003c/script>"));
});
