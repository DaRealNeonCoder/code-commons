import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("runner deployment has the independent hardening policy", async () => {
  const deployment = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const csp = deployment.headers[0].headers.find((header) => header.key === "Content-Security-Policy").value;
  for (const directive of [
    "connect-src 'none'",
    "script-src 'self' blob:",
    "worker-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "form-action 'none'",
    "navigate-to 'none'",
    "frame-ancestors https://code-commons.vercel.app",
  ]) assert.match(csp, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(csp, /unsafe-eval|unpkg|unsafe-inline/);
});
