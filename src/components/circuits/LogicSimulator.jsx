"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  canConnect,
  compileCircuitToChip,
  computeSimulation,
  findConnectionTo,
  genId,
  getPortCounts,
} from "@/lib/circuits/engine";

const PRESET_COLORS = ["#8b5cf6", "#0ea5e9", "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#ef4444", "#64748b"];

function getComponentSize(comp, chips) {
  if (comp.kind === "NAND") return { width: 72, height: 48 };
  if (comp.kind === "LED") return { width: 44, height: 44 };
  if (comp.kind === "INPUT") return { width: 56, height: 32 };
  if (comp.kind === "CHIP") {
    const chip = comp.chipId ? chips[comp.chipId] : undefined;
    const portCount = Math.max(chip?.numInputs ?? 1, chip?.numOutputs ?? 1, 1);
    const width = Math.max(96, 24 + (chip?.name.length ?? 4) * 8);
    const height = Math.max(48, portCount * 22 + 16);
    return { width, height };
  }
  return { width: 60, height: 40 };
}

function wirePath(x1, y1, x2, y2) {
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function LogicSimulator() {
  const [components, setComponents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [chips, setChips] = useState({});
  const [pending, setPending] = useState(null); // { from: { componentId, portIndex } }
  const [mousePos, setMousePos] = useState(null);
  const [selected, setSelected] = useState(null); // { type: "component" | "wire", id }
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const canvasRef = useRef(null);

  // The simulation is recomputed from plain data whenever the circuit
  // changes — it never inspects React instances or the DOM.
  const sim = useMemo(() => computeSimulation(components, connections, chips), [components, connections, chips]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 1800);
    return () => clearTimeout(t);
  }, [errorMsg]);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "Escape") setPending(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        if (selected.type === "component") deleteComponent(selected.id);
        else deleteConnection(selected.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function deleteComponent(id) {
    setComponents((cs) => cs.filter((c) => c.id !== id));
    setConnections((cs) => cs.filter((c) => c.from.componentId !== id && c.to.componentId !== id));
    setSelected(null);
  }
  function deleteConnection(id) {
    setConnections((cs) => cs.filter((c) => c.id !== id));
    setSelected(null);
  }

  function getSize(comp) {
    return getComponentSize(comp, chips);
  }
  function getPortXY(comp, dir, index) {
    const counts = getPortCounts(comp, chips);
    const n = dir === "in" ? counts.numInputs : counts.numOutputs;
    const size = getSize(comp);
    const x = comp.x + (dir === "in" ? 0 : size.width);
    const y = comp.y + ((index + 1) * size.height) / (n + 1);
    return { x, y };
  }
  function getInputPortValue(comp, portIndex) {
    const conn = findConnectionTo(connections, comp.id, portIndex);
    if (!conn) return false;
    return sim.outputValues[conn.from.componentId]?.[conn.from.portIndex] ?? false;
  }

  function handleComponentMouseDown(e, comp) {
    if (e.button !== 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const offsetX = e.clientX - rect.left - comp.x;
    const offsetY = e.clientY - rect.top - comp.y;
    let moved = false;

    function onMove(ev) {
      if (Math.abs(ev.clientX - startClientX) > 3 || Math.abs(ev.clientY - startClientY) > 3) moved = true;
      const nx = ev.clientX - rect.left - offsetX;
      const ny = ev.clientY - rect.top - offsetY;
      setComponents((cs) => cs.map((c) => (c.id === comp.id ? { ...c, x: nx, y: ny } : c)));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!moved) {
        setSelected({ type: "component", id: comp.id });
        if (comp.kind === "INPUT") {
          setComponents((cs) => cs.map((c) => (c.id === comp.id ? { ...c, value: !c.value } : c)));
        }
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handlePortMouseDown(componentId, dir, portIndex) {
    setErrorMsg(null);
    if (dir === "out") {
      setPending((p) =>
        p && p.from.componentId === componentId && p.from.portIndex === portIndex
          ? null
          : { from: { componentId, portIndex } }
      );
      return;
    }
    if (!pending) {
      setErrorMsg("Start a wire from an output point first");
      return;
    }
    const to = { componentId, portIndex };
    const check = canConnect(components, connections, chips, pending.from, to);
    if (!check.ok) {
      setErrorMsg(check.reason ?? "Invalid connection");
      return;
    }
    setConnections((cs) => [...cs, { id: genId("w"), from: pending.from, to }]);
    setPending(null);
  }

  function handleCanvasMouseDown(e) {
    if (e.target === e.currentTarget) {
      setSelected(null);
      setPending(null);
    }
  }
  function handleCanvasMouseMove(e) {
    if (!pending) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleDragStart(e, item) {
    e.dataTransfer.setData("kind", item.kind);
    if (item.kind === "CHIP") e.dataTransfer.setData("chipId", item.chipId);
    e.dataTransfer.effectAllowed = "copy";
  }
  function handleDrop(e) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("kind");
    if (!kind) return;
    const chipId = e.dataTransfer.getData("chipId") || undefined;
    const rect = canvasRef.current.getBoundingClientRect();
    const size = getComponentSize({ kind, chipId }, chips);
    const x = e.clientX - rect.left - size.width / 2;
    const y = e.clientY - rect.top - size.height / 2;
    const newComp = {
      id: genId("c"),
      kind,
      chipId,
      x,
      y,
      value: kind === "INPUT" ? false : undefined,
    };
    setComponents((cs) => [...cs, newComp]);
  }

  const inputCount = components.filter((c) => c.kind === "INPUT").length;
  const outputCount = components.filter((c) => c.kind === "LED").length;
  const canCreateChip = inputCount > 0 && outputCount > 0;

  function handleCreateChip(name, color) {
    const chip = compileCircuitToChip(components, connections, chips, name, color);
    setChips((prev) => ({ ...prev, [chip.id]: chip }));
    setModalOpen(false);
  }

  function kindClasses(comp) {
    switch (comp.kind) {
      case "NAND":
        return "bg-blue-600 text-white";
      case "LED":
        return sim.ledValues[comp.id]
          ? "bg-yellow-300 text-zinc-900 shadow-[0_0_16px_4px_rgba(253,224,71,0.55)]"
          : "bg-zinc-800 text-zinc-600 border border-zinc-700";
      case "INPUT":
        return comp.value ? "bg-emerald-400 text-zinc-900" : "bg-zinc-700 text-zinc-300";
      default:
        return "text-white";
    }
  }
  function renderLabel(comp) {
    if (comp.kind === "NAND") return "NAND";
    if (comp.kind === "INPUT") return comp.value ? "1" : "0";
    if (comp.kind === "CHIP") return chips[comp.chipId ?? ""]?.name ?? "?";
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      {/* component palette */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-4 py-2">
        <PaletteSwatch label="IN" className="bg-zinc-700 text-zinc-200" onDragStart={(e) => handleDragStart(e, { kind: "INPUT" })} />
        <PaletteSwatch label="NAND" className="bg-blue-600 text-white" onDragStart={(e) => handleDragStart(e, { kind: "NAND" })} />
        <PaletteSwatch label="LED" className="border border-zinc-600 bg-zinc-800 text-zinc-400" onDragStart={(e) => handleDragStart(e, { kind: "LED" })} />
        {Object.values(chips).map((chip) => (
          <PaletteSwatch
            key={chip.id}
            label={chip.name}
            style={{ backgroundColor: chip.color, color: "#fff" }}
            onDragStart={(e) => handleDragStart(e, { kind: "CHIP", chipId: chip.id })}
          />
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-3 border-l border-zinc-800 pl-4">
          {!canCreateChip && (
            <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">add an input + LED first</span>
          )}
          <button
            disabled={!canCreateChip}
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-violet-600 px-3 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            + Create Chip
          </button>
        </div>
      </div>

      {/* simulation canvas */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex-1 overflow-hidden bg-zinc-900"
        style={{
          backgroundImage: "radial-gradient(circle, #3f3f4666 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
          {connections.map((conn) => {
            const fromComp = components.find((c) => c.id === conn.from.componentId);
            const toComp = components.find((c) => c.id === conn.to.componentId);
            if (!fromComp || !toComp) return null;
            const p1 = getPortXY(fromComp, "out", conn.from.portIndex);
            const p2 = getPortXY(toComp, "in", conn.to.portIndex);
            const value = sim.outputValues[fromComp.id]?.[conn.from.portIndex] ?? false;
            const isSelected = selected?.type === "wire" && selected.id === conn.id;
            return (
              <path
                key={conn.id}
                d={wirePath(p1.x, p1.y, p2.x, p2.y)}
                fill="none"
                stroke={isSelected ? "#f4f4f5" : value ? "#a3e635" : "#52525b"}
                strokeWidth={isSelected ? 4 : value ? 3 : 2}
                style={{
                  pointerEvents: "stroke",
                  cursor: "pointer",
                  filter: value ? "drop-shadow(0 0 4px rgba(163,230,53,0.6))" : undefined,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelected({ type: "wire", id: conn.id });
                  setPending(null);
                }}
              />
            );
          })}
          {pending &&
            mousePos &&
            (() => {
              const fromComp = components.find((c) => c.id === pending.from.componentId);
              if (!fromComp) return null;
              const p1 = getPortXY(fromComp, "out", pending.from.portIndex);
              return (
                <path
                  d={wirePath(p1.x, p1.y, mousePos.x, mousePos.y)}
                  fill="none"
                  stroke="#e4e4e7"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  style={{ pointerEvents: "none" }}
                />
              );
            })()}
        </svg>

        {components.map((comp) => {
          const size = getSize(comp);
          const counts = getPortCounts(comp, chips);
          const isSelected = selected?.type === "component" && selected.id === comp.id;
          const pillShape = comp.kind === "LED" || comp.kind === "INPUT";
          return (
            <Fragment key={comp.id}>
              <div
                onMouseDown={(e) => handleComponentMouseDown(e, comp)}
                className={`absolute flex select-none items-center justify-center font-mono text-xs font-semibold ${
                  isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900" : ""
                } ${kindClasses(comp)}`}
                style={{
                  left: comp.x,
                  top: comp.y,
                  width: size.width,
                  height: size.height,
                  borderRadius: pillShape ? 9999 : 8,
                  cursor: "grab",
                  ...(comp.kind === "CHIP" && comp.chipId ? { backgroundColor: chips[comp.chipId]?.color } : {}),
                }}
              >
                {renderLabel(comp)}
              </div>
              {Array.from({ length: counts.numInputs }).map((_, i) => {
                const pos = getPortXY(comp, "in", i);
                const value = getInputPortValue(comp, i);
                return (
                  <div
                    key={`in-${comp.id}-${i}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handlePortMouseDown(comp.id, "in", i);
                    }}
                    className="absolute rounded-full border-2 border-teal-400"
                    style={{
                      left: pos.x - 5,
                      top: pos.y - 5,
                      width: 10,
                      height: 10,
                      backgroundColor: value ? "#4ade80" : "#27272a",
                      cursor: "crosshair",
                    }}
                  />
                );
              })}
              {Array.from({ length: counts.numOutputs }).map((_, i) => {
                const pos = getPortXY(comp, "out", i);
                const value = sim.outputValues[comp.id]?.[i] ?? false;
                return (
                  <div
                    key={`out-${comp.id}-${i}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handlePortMouseDown(comp.id, "out", i);
                    }}
                    className="absolute rounded-full border-2 border-amber-400"
                    style={{
                      left: pos.x - 5,
                      top: pos.y - 5,
                      width: 10,
                      height: 10,
                      backgroundColor: value ? "#4ade80" : "#27272a",
                      cursor: "crosshair",
                    }}
                  />
                );
              })}
            </Fragment>
          );
        })}

        {components.length === 0 && (
          <p className="pointer-events-none absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-xs text-zinc-600">
            Drag parts from the menu above onto the canvas to start building.
          </p>
        )}

        {errorMsg && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-red-900 bg-red-950/90 px-3 py-1.5 font-mono text-xs text-red-300 shadow-lg">
            {errorMsg}
          </div>
        )}

        <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] text-zinc-600">
          click an output (amber), then an input (teal) to wire them &middot; select + delete to remove
        </p>
      </div>

      {modalOpen && <CreateChipModal onCancel={() => setModalOpen(false)} onConfirm={handleCreateChip} />}
    </div>
  );
}

function PaletteSwatch({ label, className, style, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`flex h-9 shrink-0 min-w-[3.25rem] cursor-grab items-center justify-center rounded-md px-2 font-mono text-[11px] font-semibold active:cursor-grabbing ${className ?? ""}`}
      style={style}
    >
      {label}
    </div>
  );
}

function CreateChipModal({ onCancel, onConfirm }) {
  const [name, setName] = useState("My Chip");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-80 rounded-lg border border-zinc-800 bg-zinc-900 p-5 font-mono text-sm text-zinc-200 shadow-xl">
        <h2 className="mb-4 text-sm font-semibold text-white">Create Chip</h2>
        <label className="mb-1 block text-xs text-zinc-500">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-violet-500"
        />
        <label className="mb-2 block text-xs text-zinc-500">Color</label>
        <div className="mb-5 flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-white" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name.trim() || "Chip", color)}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
