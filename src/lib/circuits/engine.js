// ---------------------------------------------------------------------------
// Shapes used throughout this file (plain JS objects, described here for
// reference — nothing enforces these, they're just the conventions used):
//
// EditorComponent   { id, kind: "INPUT"|"NAND"|"LED"|"CHIP", chipId?, x, y, value? }
// EditorConnection  { id, from: PortRef, to: PortRef }
// PortRef           { componentId, portIndex }
//
// Source            { kind: "const", value }
//                  | { kind: "external", index }
//                  | { kind: "gate", gateId }
// CompiledGate      { id, type: "NAND", inputs: [Source, Source] }
// CompiledChip      { id, name, color, numInputs, numOutputs, gates, outputSources }
//
// SimulationResult  { outputValues: { [componentId]: boolean[] }, ledValues: { [componentId]: boolean } }
// ---------------------------------------------------------------------------

let idCounter = 0;
export function genId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

/** How many input/output ports a component exposes, given its kind. */
export function getPortCounts(comp, chips) {
  switch (comp.kind) {
    case "INPUT":
      return { numInputs: 0, numOutputs: 1 };
    case "NAND":
      return { numInputs: 2, numOutputs: 1 };
    case "LED":
      return { numInputs: 1, numOutputs: 0 };
    case "CHIP": {
      const chip = comp.chipId ? chips[comp.chipId] : undefined;
      return chip
        ? { numInputs: chip.numInputs, numOutputs: chip.numOutputs }
        : { numInputs: 0, numOutputs: 0 };
    }
    default:
      return { numInputs: 0, numOutputs: 0 };
  }
}

export function findConnectionTo(connections, componentId, portIndex) {
  return connections.find(
    (c) => c.to.componentId === componentId && c.to.portIndex === portIndex
  );
}

function outgoingMap(connections) {
  const map = new Map();
  for (const c of connections) {
    const list = map.get(c.from.componentId) ?? [];
    list.push(c.to.componentId);
    map.set(c.from.componentId, list);
  }
  return map;
}

/** Can `target` be reached from `start` by following existing wires? */
function canReach(start, target, connections) {
  const adjacency = outgoingMap(connections);
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const node = stack.pop();
    if (node === target) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of adjacency.get(node) ?? []) stack.push(next);
  }
  return false;
}

/**
 * Validate a prospective wire from an output port to an input port.
 * Returns { ok: boolean, reason?: string }.
 */
export function canConnect(components, connections, chips, from, to) {
  const fromComp = components.find((c) => c.id === from.componentId);
  const toComp = components.find((c) => c.id === to.componentId);
  if (!fromComp || !toComp) return { ok: false, reason: "Unknown component" };

  const fromCounts = getPortCounts(fromComp, chips);
  const toCounts = getPortCounts(toComp, chips);

  if (from.portIndex >= fromCounts.numOutputs) {
    return { ok: false, reason: "That point isn't an output" };
  }
  if (to.portIndex >= toCounts.numInputs) {
    return { ok: false, reason: "That point isn't an input" };
  }
  if (from.componentId === to.componentId) {
    return { ok: false, reason: "A component can't feed its own input" };
  }
  if (findConnectionTo(connections, to.componentId, to.portIndex)) {
    return { ok: false, reason: "That input already has a wire" };
  }
  if (canReach(to.componentId, from.componentId, connections)) {
    return { ok: false, reason: "That would create a loop" };
  }
  return { ok: true };
}

/** Evaluate a compiled (flattened) chip for a given set of input values. */
export function evaluateCompiledChip(chip, inputValues) {
  const gateById = new Map(chip.gates.map((g) => [g.id, g]));
  const cache = new Map();

  function resolve(source) {
    if (source.kind === "const") return source.value;
    if (source.kind === "external") return inputValues[source.index] ?? false;
    return evalGate(source.gateId);
  }

  function evalGate(gateId) {
    const cached = cache.get(gateId);
    if (cached !== undefined) return cached;
    const gate = gateById.get(gateId);
    if (!gate) return false;
    const a = resolve(gate.inputs[0]);
    const b = resolve(gate.inputs[1]);
    const result = !(a && b);
    cache.set(gateId, result);
    return result;
  }

  return chip.outputSources.map(resolve);
}

/**
 * Run the whole editor circuit and report the value on every port.
 * Operates entirely on plain data (components + connections) — never on
 * rendered DOM nodes or React component instances.
 */
export function computeSimulation(components, connections, chips) {
  const byId = new Map(components.map((c) => [c.id, c]));
  const outputValues = {};
  const visiting = new Set();

  function getInput(componentId, portIndex) {
    const conn = findConnectionTo(connections, componentId, portIndex);
    if (!conn) return false; // an unconnected input reads LOW
    return getOutput(conn.from.componentId, conn.from.portIndex);
  }

  function getOutput(componentId, portIndex) {
    const cached = outputValues[componentId];
    if (cached) return cached[portIndex] ?? false;
    if (visiting.has(componentId)) return false; // safety net; cycles are rejected on creation
    visiting.add(componentId);

    const comp = byId.get(componentId);
    let result = [];
    if (comp) {
      if (comp.kind === "INPUT") {
        result = [!!comp.value];
      } else if (comp.kind === "NAND") {
        const a = getInput(componentId, 0);
        const b = getInput(componentId, 1);
        result = [!(a && b)];
      } else if (comp.kind === "CHIP" && comp.chipId && chips[comp.chipId]) {
        const chip = chips[comp.chipId];
        const ins = [];
        for (let i = 0; i < chip.numInputs; i++) ins.push(getInput(componentId, i));
        result = evaluateCompiledChip(chip, ins);
      }
    }
    visiting.delete(componentId);
    outputValues[componentId] = result;
    return result[portIndex] ?? false;
  }

  const ledValues = {};
  for (const comp of components) {
    if (comp.kind === "LED") {
      ledValues[comp.id] = getInput(comp.id, 0);
    } else {
      const counts = getPortCounts(comp, chips);
      for (let i = 0; i < counts.numOutputs; i++) getOutput(comp.id, i);
    }
  }

  return { outputValues, ledValues };
}

/**
 * Compile the current editor circuit into a flattened, reusable chip.
 *
 * - Every INPUT component becomes one external input.
 * - Every LED becomes one external output.
 * - Ports are ordered top-to-bottom, then left-to-right, so a chip's
 *   interface never reshuffles on recompile.
 * - Any nested custom chips are inlined into plain NAND gates, so the
 *   stored implementation is always a flat gate graph — never a truth
 *   table, and never a reference to another chip definition.
 */
export function compileCircuitToChip(components, connections, chips, name, color) {
  const byId = new Map(components.map((c) => [c.id, c]));
  const spatialOrder = (a, b) => a.y - b.y || a.x - b.x;

  const inputComponents = components.filter((c) => c.kind === "INPUT").sort(spatialOrder);
  const outputComponents = components.filter((c) => c.kind === "LED").sort(spatialOrder);
  const inputIndex = new Map(inputComponents.map((c, i) => [c.id, i]));

  const gates = [];
  const nandCache = new Map(); // componentId -> its output source
  const chipInstanceCache = new Map(); // componentId -> output sources

  function resolveInput(componentId, portIndex) {
    const conn = findConnectionTo(connections, componentId, portIndex);
    if (!conn) return { kind: "const", value: false }; // unconnected input = LOW
    return resolveOutput(conn.from.componentId, conn.from.portIndex);
  }

  function resolveOutput(componentId, portIndex) {
    const comp = byId.get(componentId);
    if (!comp) return { kind: "const", value: false };

    if (comp.kind === "INPUT") {
      return { kind: "external", index: inputIndex.get(componentId) ?? 0 };
    }

    if (comp.kind === "NAND") {
      const cached = nandCache.get(componentId);
      if (cached) return cached;
      const a = resolveInput(componentId, 0);
      const b = resolveInput(componentId, 1);
      const gateId = genId("g");
      gates.push({ id: gateId, type: "NAND", inputs: [a, b] });
      const source = { kind: "gate", gateId };
      nandCache.set(componentId, source);
      return source;
    }

    if (comp.kind === "CHIP" && comp.chipId && chips[comp.chipId]) {
      const cached = chipInstanceCache.get(componentId);
      if (cached) return cached[portIndex] ?? { kind: "const", value: false };

      const sub = chips[comp.chipId];
      // What feeds each of the sub-chip's external inputs, in this circuit.
      const bindings = [];
      for (let i = 0; i < sub.numInputs; i++) bindings.push(resolveInput(componentId, i));

      // Clone the sub-chip's gates with fresh ids so instances never collide.
      const idMap = new Map();
      for (const g of sub.gates) idMap.set(g.id, genId("g"));

      const remap = (s) => {
        if (s.kind === "external") return bindings[s.index] ?? { kind: "const", value: false };
        if (s.kind === "gate") return { kind: "gate", gateId: idMap.get(s.gateId) };
        return s;
      };

      for (const g of sub.gates) {
        gates.push({
          id: idMap.get(g.id),
          type: "NAND",
          inputs: [remap(g.inputs[0]), remap(g.inputs[1])],
        });
      }

      const outputs = sub.outputSources.map(remap);
      chipInstanceCache.set(componentId, outputs);
      return outputs[portIndex] ?? { kind: "const", value: false };
    }

    return { kind: "const", value: false };
  }

  const outputSources = outputComponents.map((led) => resolveInput(led.id, 0));

  return {
    id: genId("chip"),
    name,
    color,
    numInputs: inputComponents.length,
    numOutputs: outputComponents.length,
    gates,
    outputSources,
  };
}