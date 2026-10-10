import { parseCircuit } from "./circuitData.js";
import { computeSimulation, getPortCounts } from "./engine.js";

const MAX_PORTS = 5000;
const MAX_TEST_CASES = 1000;
const MAX_GATES = 10_000;
const MAX_DEPTH = 256;
const MAX_CHECK_WORK = 20_000_000;
const validId = (id) => typeof id === "string" && /^[\w-]{1,100}$/.test(id) && !Object.hasOwn(Object.prototype, id);
const isBit = (value) => value === true || value === false || value === 0 || value === 1;
const isCount = (value) => Number.isInteger(value) && value >= 0 && value <= MAX_PORTS;

export class InvalidCircuitError extends Error {}
export class InvalidPuzzleError extends Error {}

function requireCircuit(condition) {
  if (!condition) throw new InvalidCircuitError("The circuit contains invalid components, chips, or connections.");
}

// Validate the public interface independently of the secret cases. Never derive
// port ordering from positions or from the submitted circuit.
export function getPuzzlePorts(value, starterCircuit) {
  if (
    !value ||
    !Array.isArray(value.inputs) ||
    !Array.isArray(value.outputs) ||
    value.inputs.length > MAX_PORTS ||
    value.outputs.length > MAX_PORTS
  ) {
    throw new InvalidPuzzleError("Invalid circuit puzzle configuration.");
  }
  const ids = [...value.inputs, ...value.outputs];
  const starter = parseCircuit(starterCircuit);
  if (!starter || value.outputs.length === 0 || !ids.every(validId) || new Set(ids).size !== ids.length) {
    throw new InvalidPuzzleError("Invalid circuit puzzle configuration.");
  }
  const components = new Map(starter.components.map((c) => [c?.id, c]));
  if (
    components.size !== starter.components.length ||
    !value.inputs.every((id) => components.get(id)?.kind === "INPUT") ||
    !value.outputs.every((id) => components.get(id)?.kind === "LED") ||
    starter.components.some((c) => !c || ((c.kind === "INPUT" || c.kind === "LED") && !ids.includes(c.id)))
  ) {
    throw new InvalidPuzzleError("Invalid circuit puzzle configuration.");
  }
  return { inputs: [...value.inputs], outputs: [...value.outputs] };
}

export function getPuzzleTests(value, ports) {
  if (
    !Array.isArray(value) || value.length === 0 || value.length > MAX_TEST_CASES ||
    !value.every((test) =>
      Array.isArray(test?.input) && test.input.length === ports.inputs.length && test.input.every(isBit) &&
      Array.isArray(test?.expected) && test.expected.length === ports.outputs.length && test.expected.every(isBit)
    )
  ) {
    // Do not discard malformed cases: a partially loaded test suite could accept
    // an incorrect solution. This error deliberately contains no test data.
    throw new InvalidPuzzleError("Invalid circuit puzzle configuration.");
  }
  return value.map((test) => ({ input: test.input.map(Boolean), expected: test.expected.map(Boolean) }));
}

// Iterative topological traversal rejects loops and caps dependency depth before
// entering the shared recursive simulator (including user-supplied chip graphs).
function validateGraph(dependencies) {
  const remaining = new Map();
  const dependents = new Map();
  const depth = new Map();
  const ready = [];
  for (const [id, sources] of dependencies) {
    remaining.set(id, sources.length);
    depth.set(id, 1);
    if (sources.length === 0) ready.push(id);
    for (const source of sources) {
      requireCircuit(dependencies.has(source));
      if (!dependents.has(source)) dependents.set(source, []);
      dependents.get(source).push(id);
    }
  }
  for (let i = 0; i < ready.length; i++) {
    const id = ready[i];
    requireCircuit(depth.get(id) <= MAX_DEPTH);
    for (const next of dependents.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next), depth.get(id) + 1));
      remaining.set(next, remaining.get(next) - 1);
      if (remaining.get(next) === 0) ready.push(next);
    }
  }
  requireCircuit(ready.length === dependencies.size);
}

function validateChip(chip) {
  requireCircuit(chip && isCount(chip.numInputs) && isCount(chip.numOutputs));
  requireCircuit(Array.isArray(chip.gates) && chip.gates.length <= MAX_GATES);
  requireCircuit(Array.isArray(chip.outputSources) && chip.outputSources.length === chip.numOutputs);
  const gates = new Map();
  for (const gate of chip.gates) {
    requireCircuit(gate && validId(gate.id) && !gates.has(gate.id) && gate.type === "NAND");
    requireCircuit(Array.isArray(gate.inputs) && gate.inputs.length === 2);
    gates.set(gate.id, gate);
  }
  function validateSource(source) {
    requireCircuit(source && typeof source === "object");
    if (source.kind === "const") requireCircuit(typeof source.value === "boolean");
    else if (source.kind === "external") {
      requireCircuit(Number.isInteger(source.index) && source.index >= 0 && source.index < chip.numInputs);
    } else {
      requireCircuit(source.kind === "gate" && gates.has(source.gateId));
    }
  }
  const dependencies = new Map();
  for (const gate of gates.values()) {
    gate.inputs.forEach(validateSource);
    dependencies.set(gate.id, gate.inputs.filter((s) => s.kind === "gate").map((s) => s.gateId));
  }
  chip.outputSources.forEach(validateSource);
  validateGraph(dependencies);
}

// Stricter than the editor's lightweight persistence parser: HTTP submissions
// cannot be trusted to have gone through canConnect or the chip compiler.
export function validatePuzzleCircuit(value, ports) {
  const circuit = parseCircuit(value);
  requireCircuit(circuit);
  const { components, connections, chips } = circuit;
  const byId = new Map();
  const dependencies = new Map();
  let work = 0;
  let gateCount = 0;
  for (const [id, chip] of Object.entries(chips)) {
    requireCircuit(validId(id));
    validateChip(chip);
    gateCount += chip.gates.length;
    requireCircuit(gateCount <= MAX_GATES);
  }
  for (const comp of components) {
    requireCircuit(comp && validId(comp.id) && !byId.has(comp.id));
    requireCircuit(["INPUT", "LED", "NAND", "CHIP"].includes(comp.kind));
    if (comp.kind === "CHIP") requireCircuit(validId(comp.chipId) && Object.hasOwn(chips, comp.chipId));
    if (comp.kind === "INPUT") requireCircuit(comp.value === undefined || isBit(comp.value));
    byId.set(comp.id, comp);
    dependencies.set(comp.id, []);
    const { numInputs, numOutputs } = getPortCounts(comp, chips);
    // The shared engine searches connections for each input and evaluates all
    // component outputs. Bound aggregate work across every hidden case.
    work += 1 + numOutputs + numInputs * (connections.length + 1);
    if (comp.kind === "CHIP") work += chips[comp.chipId].gates.length;
  }
  if (
    !ports.inputs.every((id) => byId.get(id)?.kind === "INPUT") ||
    !ports.outputs.every((id) => byId.get(id)?.kind === "LED") ||
    components.some(
      (comp) =>
        (comp.kind === "INPUT" && !ports.inputs.includes(comp.id)) ||
        (comp.kind === "LED" && !ports.outputs.includes(comp.id))
    )
  ) {
    throw new InvalidCircuitError("Keep all of the puzzle's original inputs and outputs.");
  }
  const wireIds = new Set();
  const occupied = new Set();
  for (const wire of connections) {
    requireCircuit(wire && validId(wire.id) && !wireIds.has(wire.id));
    wireIds.add(wire.id);
    const from = byId.get(wire.from?.componentId);
    const to = byId.get(wire.to?.componentId);
    requireCircuit(from && to);
    requireCircuit(Number.isInteger(wire.from.portIndex) && wire.from.portIndex >= 0 && wire.from.portIndex < getPortCounts(from, chips).numOutputs);
    requireCircuit(Number.isInteger(wire.to.portIndex) && wire.to.portIndex >= 0 && wire.to.portIndex < getPortCounts(to, chips).numInputs);
    const target = `${to.id}:${wire.to.portIndex}`;
    requireCircuit(!occupied.has(target));
    occupied.add(target);
    dependencies.get(to.id).push(from.id);
  }
  validateGraph(dependencies);
  return { circuit, work };
}

export function checkCircuitSolution(puzzle, submission) {
  const ports = getPuzzlePorts(puzzle.puzzlePorts, puzzle.starterCircuit);
  const tests = getPuzzleTests(puzzle.testCases, ports);
  const { circuit, work } = validatePuzzleCircuit(submission, ports);
  if (work * tests.length > MAX_CHECK_WORK) {
    throw new InvalidCircuitError("This circuit is too complex to check. Try simplifying it.");
  }
  const inputIndex = new Map(ports.inputs.map((id, index) => [id, index]));
  let solved = true;
  for (const test of tests) {
    const components = circuit.components.map((comp) => inputIndex.has(comp.id)
      ? { ...comp, value: test.input[inputIndex.get(comp.id)] }
      : comp);
    const { ledValues } = computeSimulation(components, circuit.connections, circuit.chips);
    // Run all cases, but return only an overall verdict: no inputs, answers,
    // actual values, per-case results, or counts cross the server boundary.
    const matches = ports.outputs.every((id, index) => ledValues[id] === test.expected[index]);
    solved = matches && solved;
  }
  return { solved };
}
