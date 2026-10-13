import assert from "node:assert/strict";
import test from "node:test";
import { removeChipFromCircuit } from "./engine.js";

test("removing a local chip also removes its instances and attached wires", () => {
  const circuit = {
    chips: {
      local_chip: { id: "local_chip", name: "Saved copy", numInputs: 1, numOutputs: 1 },
      keep_chip: { id: "keep_chip", name: "Keep", numInputs: 1, numOutputs: 1 },
    },
    components: [
      { id: "input", kind: "INPUT" },
      { id: "removed", kind: "CHIP", chipId: "local_chip" },
      { id: "keep", kind: "CHIP", chipId: "keep_chip" },
      { id: "led", kind: "LED" },
    ],
    connections: [
      { id: "w1", from: { componentId: "input", portIndex: 0 }, to: { componentId: "removed", portIndex: 0 } },
      { id: "w2", from: { componentId: "keep", portIndex: 0 }, to: { componentId: "led", portIndex: 0 } },
    ],
  };

  const next = removeChipFromCircuit(circuit, "local_chip");

  assert.deepEqual(Object.keys(next.chips), ["keep_chip"]);
  assert.deepEqual(next.components.map((component) => component.id), ["input", "keep", "led"]);
  assert.deepEqual(next.connections.map((connection) => connection.id), ["w2"]);
  assert.equal(next.removedComponentCount, 1);
  assert.ok(circuit.chips.local_chip, "removal must not mutate the current snapshot");
});
