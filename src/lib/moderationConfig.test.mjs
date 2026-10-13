import assert from "node:assert/strict";
import test from "node:test";
import { getConfiguredRole } from "./moderationConfig.js";

test("configured owner takes precedence over moderator email matches", () => {
  assert.equal(getConfiguredRole("OWNER@EXAMPLE.COM", "owner@example.com", ["owner@example.com"]), "owner");
  assert.equal(getConfiguredRole("mod@example.com", "owner@example.com", ["mod@example.com"]), "moderator");
  assert.equal(getConfiguredRole("other@example.com", "owner@example.com", ["mod@example.com"]), null);
});
