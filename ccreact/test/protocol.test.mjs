import test from "node:test";
import assert from "node:assert/strict";
import { isValidInitMessage, isValidRunnerMessage, MAIN_APP_ORIGIN } from "../src/protocol.js";

const nonce = "0123456789abcdef";
const parent = {};
const frame = {};

test("protocol requires source, production origin, shape, and nonce", () => {
  const event = { source: parent, origin: MAIN_APP_ORIGIN, data: { type: "react-demo:init", nonce, demo: { compiled: "x" } } };
  assert.equal(isValidInitMessage(event, parent, nonce), true);
  assert.equal(isValidInitMessage({ ...event, source: {} }, parent, nonce), false);
  assert.equal(isValidInitMessage({ ...event, origin: "https://evil.example" }, parent, nonce), false);
  assert.equal(isValidInitMessage({ ...event, data: { ...event.data, nonce: "wrong" } }, parent, nonce), false);
  assert.equal(isValidInitMessage({ ...event, data: { ...event.data, demo: { compiled: "" } } }, parent, nonce), false);
});

test("parent accepts only messages from its frame and nonce", () => {
  const event = { source: frame, origin: "null", data: { type: "react-demo:ready", nonce } };
  assert.equal(isValidRunnerMessage(event, frame, nonce), true);
  assert.equal(isValidRunnerMessage({ ...event, source: {} }, frame, nonce), false);
  assert.equal(isValidRunnerMessage({ ...event, data: { ...event.data, nonce: "wrong" } }, frame, nonce), false);
  assert.equal(isValidRunnerMessage({ ...event, data: { type: "react-demo:init", nonce } }, frame, nonce), false);
});
