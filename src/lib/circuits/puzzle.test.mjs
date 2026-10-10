import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseFrontmatter } from "../frontmatter.js";
import { compileCircuitToChip } from "./engine.js";
import { checkCircuitSolution, InvalidCircuitError, InvalidPuzzleError } from "./puzzle.js";

const { data: xor } = parseFrontmatter(readFileSync(new URL("../../../content/circuits/xor-from-nand.mdx", import.meta.url), "utf8"));
const wire = (id, from, to, port = 0, output = 0) => ({
  id, from: { componentId: from, portIndex: output }, to: { componentId: to, portIndex: port },
});
function xorSolution() {
  const circuit = structuredClone(xor.starterCircuit);
  for (let i = 1; i <= 4; i++) circuit.components.push({ id: `n${i}`, kind: "NAND", x: i * 90, y: 160 });
  circuit.connections = [
    wire("w1", "input_a", "n1"), wire("w2", "input_b", "n1", 1),
    wire("w3", "input_a", "n2"), wire("w4", "n1", "n2", 1),
    wire("w5", "input_b", "n3"), wire("w6", "n1", "n3", 1),
    wire("w7", "n2", "n4"), wire("w8", "n3", "n4", 1), wire("w9", "n4", "led_out"),
  ];
  return circuit;
}

test("the XOR starter is unsolved; a four-NAND solution passes without returning test data", () => {
  assert.deepEqual(checkCircuitSolution(xor, xor.starterCircuit), { solved: false });
  const solution = xorSolution();
  const original = structuredClone(solution);
  assert.deepEqual(checkCircuitSolution(xor, solution), { solved: true });
  assert.deepEqual(solution, original, "checking must not mutate the submitted circuit");
  solution.connections[8].from.componentId = "n1";
  assert.deepEqual(checkCircuitSolution(xor, solution), { solved: false });
});

test("port identities survive moving, reordering, and toggling components", () => {
  const solution = xorSolution();
  solution.components.reverse();
  solution.components.forEach((c, index) => { c.x = -index * 80; c.y = -index * 60; c.value = true; });
  assert.deepEqual(checkCircuitSolution(xor, solution), { solved: true });
});

test("arbitrary-width input/output arrays are checked in declared order", () => {
  const count = 40;
  const inputs = Array.from({ length: count }, (_, i) => `in_${i}`);
  const outputs = Array.from({ length: count }, (_, i) => `out_${i}`);
  const starterCircuit = {
    components: [...inputs.map((id) => ({ id, kind: "INPUT" })), ...outputs.map((id) => ({ id, kind: "LED" }))],
    connections: [], chips: {},
  };
  const puzzle = {
    starterCircuit,
    puzzlePorts: { inputs, outputs: [...outputs].reverse() },
    testCases: Array.from({ length: count }, (_, bit) => ({
      input: inputs.map((_, i) => Number(i === bit)),
      expected: outputs.map((_, i) => Number(count - 1 - i === bit)),
    })),
  };
  const circuit = { ...starterCircuit, connections: inputs.map((id, i) => wire(`w${i}`, id, outputs[i])) };
  assert.deepEqual(checkCircuitSolution(puzzle, circuit), { solved: true });
  circuit.connections[39].from.componentId = inputs[0];
  assert.deepEqual(checkCircuitSolution(puzzle, circuit), { solved: false });
});

test("unequal input/output counts and a zero-input constant puzzle work", () => {
  const circuit = {
    components: [{ id: "a", kind: "INPUT" }, { id: "out", kind: "LED" }, { id: "inverse", kind: "LED" }, { id: "n", kind: "NAND" }],
    connections: [wire("w1", "a", "out"), wire("w2", "a", "n"), wire("w3", "a", "n", 1), wire("w4", "n", "inverse")],
    chips: {},
  };
  assert.deepEqual(checkCircuitSolution({
    starterCircuit: circuit, puzzlePorts: { inputs: ["a"], outputs: ["inverse", "out"] },
    testCases: [{ input: [0], expected: [1, 0] }, { input: [1], expected: [0, 1] }],
  }, circuit), { solved: true });
  const constant = { components: [{ id: "out", kind: "LED" }, { id: "n", kind: "NAND" }], connections: [wire("w", "n", "out")], chips: {} };
  assert.deepEqual(checkCircuitSolution({
    starterCircuit: constant, puzzlePorts: { inputs: [], outputs: ["out"] }, testCases: [{ input: [], expected: [true] }],
  }, constant), { solved: true });
});

test("compiled reusable NAND chips use the same semantics as the editor", () => {
  const solution = xorSolution();
  const chip = compileCircuitToChip(solution.components, solution.connections, {}, "XOR", "#ffffff");
  const circuit = structuredClone(xor.starterCircuit);
  circuit.chips[chip.id] = chip;
  circuit.components.push({ id: "custom", kind: "CHIP", chipId: chip.id });
  circuit.connections = [wire("w1", "input_a", "custom"), wire("w2", "input_b", "custom", 1), wire("w3", "custom", "led_out")];
  assert.deepEqual(checkCircuitSolution(xor, circuit), { solved: true });
  chip.gates[0].inputs[0] = { kind: "gate", gateId: chip.gates[0].id };
  assert.throws(() => checkCircuitSolution(xor, circuit), InvalidCircuitError);
});

test("extra switches and LEDs cannot be used to bypass a puzzle interface", () => {
  const circuit = { components: [{ id: "out", kind: "LED" }], connections: [], chips: {} };
  const puzzle = { starterCircuit: circuit, puzzlePorts: { inputs: [], outputs: ["out"] }, testCases: [{ input: [], expected: [true] }] };
  const submission = structuredClone(circuit);
  submission.components.push({ id: "constant", kind: "INPUT", value: true }, { id: "probe", kind: "LED" });
  submission.connections.push(wire("w1", "constant", "out"), wire("w2", "constant", "probe"));
  assert.throws(() => checkCircuitSolution(puzzle, submission), InvalidCircuitError);
});

for (const [name, mutate] of [
  ["deleted input", (c) => { c.components = c.components.filter((part) => part.id !== "input_a"); }],
  ["deleted output", (c) => { c.components = c.components.filter((part) => part.id !== "led_out"); }],
  ["replacement terminal", (c) => { c.components.find((part) => part.id === "led_out").id = "replacement"; }],
  ["terminal kind spoofing", (c) => { c.components.find((part) => part.id === "input_a").kind = "NAND"; }],
  ["duplicate component id", (c) => { c.components.push({ ...c.components[0] }); }],
  ["reserved object key", (c) => { c.components.push({ id: "__proto__", kind: "NAND" }); }],
  ["unknown component", (c) => { c.connections[0].from.componentId = "missing"; }],
  ["negative port", (c) => { c.connections[0].to.portIndex = -1; }],
  ["noninteger port", (c) => { c.connections[0].to.portIndex = 0.5; }],
  ["out-of-range output", (c) => { c.connections[0].from.portIndex = 1; }],
  ["multiple drivers", (c) => { c.connections.push({ ...c.connections[0], id: "another" }); }],
  ["component cycle", (c) => { c.connections[0].from.componentId = "n4"; }],
  ["unknown chip", (c) => { c.components.push({ id: "custom", kind: "CHIP", chipId: "missing" }); }],
  ["null wire", (c) => { c.connections.push(null); }],
]) {
  test(`rejects tampered submissions: ${name}`, () => {
    const circuit = xorSolution();
    mutate(circuit);
    assert.throws(() => checkCircuitSolution(xor, circuit), InvalidCircuitError);
  });
}

test("malformed private tests fail closed rather than silently dropping cases", () => {
  for (const testCases of [[], [{ input: [0], expected: [0] }], [{ input: [0, 0], expected: [0, 1] }], [{ input: [false, "false"], expected: [false] }]]) {
    assert.throws(() => checkCircuitSolution({ ...xor, testCases }, xorSolution()), InvalidPuzzleError);
  }
  assert.throws(() => checkCircuitSolution({ ...xor, puzzlePorts: { inputs: ["input_a", "input_a"], outputs: ["led_out"] } }, xorSolution()), InvalidPuzzleError);
});

test("untrusted compiled chip sources and port counts are validated", () => {
  const circuit = xorSolution();
  const chip = compileCircuitToChip(circuit.components, circuit.connections, {}, "XOR", "#ffffff");
  for (const mutate of [
    (c) => { c.numInputs = -1; },
    (c) => { c.outputSources = []; },
    (c) => { c.outputSources[0] = { kind: "gate", gateId: "missing" }; },
    (c) => { c.gates[0].inputs[0] = { kind: "external", index: 2 }; },
    (c) => { c.gates[0].inputs[0] = { kind: "const", value: "false" }; },
  ]) {
    const invalid = structuredClone(chip);
    mutate(invalid);
    assert.throws(() => checkCircuitSolution(xor, { ...circuit, chips: { [chip.id]: invalid } }), InvalidCircuitError);
  }
});
