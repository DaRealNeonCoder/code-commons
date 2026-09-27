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
const PROJECT_SLOT = "project"; // single stub save-slot; a real project picker comes later
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
const HISTORY_LIMIT = 100;
const CIRCUIT_CHANGE_DEBOUNCE_MS = 300; // matches the debounce pattern in ShaderCreator

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

/**
 * @param {string} [lessonTitle] - shown in the lesson pane; ignored when `compact`.
 * @param {React.ReactNode} [lessonContent] - shown in the lesson pane; ignored when `compact`.
 * @param {{components: any[], connections: any[], chips: Record<string, any>}} [initialCircuit]
 *   - Seeds the editor's starting circuit. Read once, on mount, via a lazy
 *     useState initializer — later changes to this prop are NOT synced back
 *     in. This is deliberately a "seed", not a controlled value: the editor
 *     owns its own state (undo/redo, drag, wiring) the same way it always
 *     has, and `onChange` is the one-way channel for a host page to read the
 *     current circuit back out.
 * @param {(circuit: {components: any[], connections: any[], chips: Record<string, any>}) => void} [onChange]
 *   - Called (debounced) with the latest circuit whenever it changes. Meant
 *     for a host page — e.g. the circuit-lesson creator — that wants to grab
 *     the current circuit at save time without wiring up a fully controlled
 *     component.
 * @param {boolean} [compact] - Hides the lesson pane and fills the height of
 *   its container instead of the full-page `100vh` layout. Use this when
 *   embedding the editor as one section of a bigger page, e.g. a lesson
 *   creator. Also controls the *default* for `showProjectIO` (see below).
 * @param {boolean} [showProjectIO] - Shows/hides the Export/Import buttons,
 *   which read and write the single global `/api/projects` scratch slot.
 *   Defaults to `!compact`, preserving old behavior at existing call sites.
 *   Pass `false` explicitly for a page that renders a *specific* circuit
 *   (e.g. /circuits/[circuitId]) but still wants the full, non-compact
 *   layout with its lesson pane — Export/Import there would silently read
 *   from and write to the unrelated global scratch slot instead of this
 *   circuit's own content, which would be confusing.
 */
export default function LogicSimulator({
  lessonTitle = "Untitled Lesson",
  lessonContent = null,
  initialCircuit = null,
  onChange = null,
  compact = false,
  showProjectIO = !compact,
}) {
  const [components, setComponents] = useState(() => initialCircuit?.components ?? []);
  const [connections, setConnections] = useState(() => initialCircuit?.connections ?? []);
  const [chips, setChips] = useState(() => initialCircuit?.chips ?? {});
  const [pending, setPending] = useState(null); // { from: { componentId, portIndex } }
  const [mousePos, setMousePos] = useState(null); // world-space, for the pending-wire preview
  // A selection is either a group of components ({ type: "components", ids: Set }),
  // a single wire ({ type: "wire", id }), or null.
  const [selected, setSelected] = useState(null);
  const [marquee, setMarquee] = useState(null); // screen-space box-select rect while dragging
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 }); // pan/zoom, in screen px
  const [spaceDown, setSpaceDown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importChipOpen, setImportChipOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", text }
  const canvasRef = useRef(null);

  // Undo/redo history. currentStateRef always mirrors the latest committed
  // components/connections/chips so pushHistory/undo/redo never read stale
  // values, no matter which render's closure happens to call them.
  const historyRef = useRef([]);
  const futureRef = useRef([]);
  const currentStateRef = useRef({ components, connections, chips });
  useEffect(() => {
    currentStateRef.current = { components, connections, chips };
  });

  // The simulation is recomputed from plain data whenever the circuit
  // changes — it never inspects React instances or the DOM.
  const sim = useMemo(() => computeSimulation(components, connections, chips), [components, connections, chips]);
  const chipIds = useMemo(() => new Set(Object.keys(chips)), [chips]);

  // Notifies a host page of the current circuit, debounced so we're not
  // firing on every mousemove while something is mid-drag or mid-wiring.
  // Read via a ref so changing the `onChange` identity every render (a
  // common mistake in a parent that passes an inline function) doesn't
  // reset the debounce timer.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (!onChangeRef.current) return;
    const t = setTimeout(() => {
      onChangeRef.current({ components, connections, chips });
    }, CIRCUIT_CHANGE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [components, connections, chips]);

  function showToast(type, text) {
    setToast({ type, text });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Undo / redo -----------------------------------------------------

  function pushHistory() {
    historyRef.current.push(currentStateRef.current);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
  }
  function applySnapshot(snap) {
    setComponents(snap.components);
    setConnections(snap.connections);
    setChips(snap.chips);
    setSelected(null);
    setPending(null);
    setMarquee(null);
  }
  function undo() {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop();
    futureRef.current.push(currentStateRef.current);
    applySnapshot(prev);
  }
  function redo() {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    historyRef.current.push(currentStateRef.current);
    applySnapshot(next);
  }

  function deleteSelected() {
    if (!selected) return;
    pushHistory();
    if (selected.type === "components") {
      const ids = selected.ids;
      setComponents((cs) => cs.filter((c) => !ids.has(c.id)));
      setConnections((cs) => cs.filter((c) => !ids.has(c.from.componentId) && !ids.has(c.to.componentId)));
    } else if (selected.type === "wire") {
      setConnections((cs) => cs.filter((c) => c.id !== selected.id));
    }
    setSelected(null);
  }

  useEffect(() => {
    function onKeyDown(e) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === " ") setSpaceDown(true);

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Escape") {
        setPending(null);
        setMarquee(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        deleteSelected();
      }
    }
    function onKeyUp(e) {
      if (e.key === " ") setSpaceDown(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // --- Zoom / pan --------------------------------------------------------

  // Ctrl/Cmd+scroll (or pinch) zooms toward the cursor; plain scroll pans.
  // Attached manually (rather than via onWheel) so preventDefault reliably
  // stops the page from scrolling instead of the canvas.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        setViewport((v) => {
          const factor = Math.exp(-e.deltaY * 0.01);
          const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
          const worldX = (cx - v.x) / v.scale;
          const worldY = (cy - v.y) / v.scale;
          return { scale: nextScale, x: cx - worldX * nextScale, y: cy - worldY * nextScale };
        });
      } else {
        setViewport((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function screenToWorld(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale,
    };
  }

  function startPan(clientX, clientY) {
    const startX = clientX;
    const startY = clientY;
    const startViewport = viewport;
    function onMove(ev) {
      setViewport({
        x: startViewport.x + (ev.clientX - startX),
        y: startViewport.y + (ev.clientY - startY),
        scale: startViewport.scale,
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function zoomBy(factor) {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setViewport((v) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const worldX = (cx - v.x) / v.scale;
      const worldY = (cy - v.y) / v.scale;
      return { scale: nextScale, x: cx - worldX * nextScale, y: cy - worldY * nextScale };
    });
  }
  function resetView() {
    setViewport({ x: 0, y: 0, scale: 1 });
  }

  // --- Box select --------------------------------------------------------

  function startMarquee(startClientX, startClientY, additive) {
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = startClientX - rect.left;
    const startY = startClientY - rect.top;
    setMarquee({ x: startX, y: startY, width: 0, height: 0 });
    let moved = false;

    function onMove(ev) {
      const curX = ev.clientX - rect.left;
      const curY = ev.clientY - rect.top;
      if (Math.abs(curX - startX) > 3 || Math.abs(curY - startY) > 3) moved = true;
      setMarquee({
        x: Math.min(startX, curX),
        y: Math.min(startY, curY),
        width: Math.abs(curX - startX),
        height: Math.abs(curY - startY),
      });
    }
    function onUp(ev) {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!moved) {
        setMarquee(null);
        if (!additive) setSelected(null);
        return;
      }
      const curX = ev.clientX - rect.left;
      const curY = ev.clientY - rect.top;
      const left = Math.min(startX, curX);
      const top = Math.min(startY, curY);
      const right = Math.max(startX, curX);
      const bottom = Math.max(startY, curY);
      const worldTL = { x: (left - viewport.x) / viewport.scale, y: (top - viewport.y) / viewport.scale };
      const worldBR = { x: (right - viewport.x) / viewport.scale, y: (bottom - viewport.y) / viewport.scale };
      const hitIds = components
        .filter((c) => {
          const size = getSize(c);
          return c.x < worldBR.x && c.x + size.width > worldTL.x && c.y < worldBR.y && c.y + size.height > worldTL.y;
        })
        .map((c) => c.id);
      setMarquee(null);
      setSelected((prev) => {
        const base = additive && prev?.type === "components" ? new Set(prev.ids) : new Set();
        hitIds.forEach((id) => base.add(id));
        return base.size > 0 ? { type: "components", ids: base } : null;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
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

    const alreadyInGroup = selected?.type === "components" && selected.ids.size > 1 && selected.ids.has(comp.id);
    const prevSelected = selected;
    if (!alreadyInGroup) {
      setSelected({ type: "components", ids: new Set([comp.id]) });
    }
    const groupIds = alreadyInGroup ? selected.ids : new Set([comp.id]);

    const startWorld = screenToWorld(e.clientX, e.clientY);
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPositions = new Map();
    components.forEach((c) => {
      if (groupIds.has(c.id)) startPositions.set(c.id, { x: c.x, y: c.y });
    });

    let moved = false;
    let historyCaptured = false;

    function onMove(ev) {
      if (Math.abs(ev.clientX - startClientX) > 3 || Math.abs(ev.clientY - startClientY) > 3) moved = true;
      if (!moved) return;
      if (!historyCaptured) {
        pushHistory();
        historyCaptured = true;
      }
      const nowWorld = screenToWorld(ev.clientX, ev.clientY);
      const dx = nowWorld.x - startWorld.x;
      const dy = nowWorld.y - startWorld.y;
      setComponents((cs) =>
        cs.map((c) => {
          const start = startPositions.get(c.id);
          return start ? { ...c, x: start.x + dx, y: start.y + dy } : c;
        })
      );
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (moved) return;
      if (e.shiftKey) {
        const base = prevSelected?.type === "components" ? new Set(prevSelected.ids) : new Set();
        if (base.has(comp.id)) base.delete(comp.id);
        else base.add(comp.id);
        setSelected(base.size > 0 ? { type: "components", ids: base } : null);
        return;
      }
      setSelected({ type: "components", ids: new Set([comp.id]) });
      if (comp.kind === "INPUT") {
        setComponents((cs) => cs.map((c) => (c.id === comp.id ? { ...c, value: !c.value } : c)));
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handlePortMouseDown(componentId, dir, portIndex) {
    setToast(null);
    if (dir === "out") {
      setPending((p) =>
        p && p.from.componentId === componentId && p.from.portIndex === portIndex
          ? null
          : { from: { componentId, portIndex } }
      );
      return;
    }
    if (!pending) {
      showToast("error", "Start a wire from an output point first");
      return;
    }
    const to = { componentId, portIndex };
    const check = canConnect(components, connections, chips, pending.from, to);
    if (!check.ok) {
      showToast("error", check.reason ?? "Invalid connection");
      return;
    }
    pushHistory();
    setConnections((cs) => [...cs, { id: genId("w"), from: pending.from, to }]);
    setPending(null);
  }

  function handleCanvasMouseDown(e) {
    if (e.target !== e.currentTarget) return;
    setPending(null);
    if (spaceDown || e.button === 1) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      return;
    }
    if (e.button !== 0) return;
    startMarquee(e.clientX, e.clientY, e.shiftKey);
  }
  function handleCanvasMouseMove(e) {
    if (!pending) return;
    setMousePos(screenToWorld(e.clientX, e.clientY));
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
    const size = getComponentSize({ kind, chipId }, chips);
    const world = screenToWorld(e.clientX, e.clientY);
    const newComp = {
      id: genId("c"),
      kind,
      chipId,
      x: world.x - size.width / 2,
      y: world.y - size.height / 2,
      value: kind === "INPUT" ? false : undefined,
    };
    pushHistory();
    setComponents((cs) => [...cs, newComp]);
  }

  const inputCount = components.filter((c) => c.kind === "INPUT").length;
  const outputCount = components.filter((c) => c.kind === "LED").length;
  const canCreateChip = inputCount > 0 && outputCount > 0;

  // Compiles the chip locally (so it's usable immediately) and also saves it
  // server-side so it shows up in "Import Chip" for other projects/sessions.
  async function handleCreateChip(name, color) {
    pushHistory();
    const chip = compileCircuitToChip(components, connections, chips, name, color);
    setChips((prev) => ({ ...prev, [chip.id]: chip }));
    setModalOpen(false);
    try {
      const res = await fetch("/api/chips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chip),
      });
      if (!res.ok) throw new Error();
      showToast("success", `"${chip.name}" saved — importable from other projects`);
    } catch {
      showToast("error", `"${chip.name}" was created, but saving it to the server failed`);
    }
  }

  function handleImportChip(chip) {
    pushHistory();
    setChips((prev) => ({ ...prev, [chip.id]: chip }));
    showToast("success", `Imported "${chip.name}"`);
  }

  async function handleExportProject() {
    setExporting(true);
    setToast(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: PROJECT_SLOT, components, connections, chips }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error();
      showToast("success", "Project saved to the server");
    } catch {
      showToast("error", "Couldn't export the project");
    } finally {
      setExporting(false);
    }
  }

  async function handleImportProject() {
    setImporting(true);
    setToast(null);
    try {
      const res = await fetch(`/api/projects?name=${PROJECT_SLOT}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error();
      const project = data.project;
      pushHistory(); // so an accidental import can be undone back to what was open
      setComponents(project.components ?? []);
      setConnections(project.connections ?? []);
      setChips((prev) => ({ ...prev, ...(project.chips ?? {}) }));
      setSelected(null);
      setPending(null);
      showToast("success", "Project loaded from the server");
    } catch {
      showToast("error", "No saved project found on the server");
    } finally {
      setImporting(false);
    }
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
    <div className={`flex ${compact ? "h-full" : "h-[calc(100vh-56px)] min-h-[600px] lg:flex-row"} flex-col bg-zinc-950`}>
      {/* Lesson pane — always visible in full-page mode (no collapse), left
          of the editor on wide screens and stacked above it on narrow ones.
          Hidden entirely in `compact` mode: the host page (e.g. the circuit
          lesson creator) renders its own title/description fields instead. */}
      {!compact && (
        <div className="max-h-64 shrink-0 overflow-y-auto border-b border-zinc-800 bg-zinc-950 px-6 py-6 lg:h-auto lg:max-h-none lg:w-[420px] lg:border-b-0 lg:border-r">
          <h2 className="mb-4 text-lg font-semibold text-white">{lessonTitle}</h2>
          <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
            {lessonContent ?? <p className="text-zinc-500">No lesson content yet.</p>}
          </div>
        </div>
      )}

      {/* Editor — component palette + simulation canvas. */}
      <div className="flex min-h-0 flex-1 flex-col">
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
              onClick={() => setImportChipOpen(true)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Import Chip
            </button>
            <button
              disabled={!canCreateChip}
              onClick={() => setModalOpen(true)}
              className="rounded-md bg-violet-600 px-3 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              + Create Chip
            </button>
          </div>

          {/* Export/Import hit the single-slot /api/projects stub, which is
              scratch-space for the standalone playground. A host page that
              embeds this editor (compact), or that renders one specific
              circuit's own content, sets showProjectIO={false} since these
              buttons would otherwise read/write an unrelated global slot. */}
          {showProjectIO && (
            <div className="flex shrink-0 items-center gap-2 border-l border-zinc-800 pl-4">
              <button
                onClick={handleExportProject}
                disabled={exporting}
                className="rounded-md border border-zinc-700 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
              >
                {exporting ? "Saving…" : "Export"}
              </button>
              <button
                onClick={handleImportProject}
                disabled={importing}
                className="rounded-md border border-zinc-700 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
              >
                {importing ? "Loading…" : "Import"}
              </button>
            </div>
          )}
        </div>

        {/* simulation canvas */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative flex-1 overflow-hidden bg-zinc-900 ${spaceDown ? "cursor-grab" : ""}`}
          style={{
            backgroundImage: "radial-gradient(circle, #3f3f4666 1px, transparent 1px)",
            backgroundSize: `${22 * viewport.scale}px ${22 * viewport.scale}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        >
          {/* World-space content: pan/zoom is a single CSS transform, so
              every child below keeps using plain circuit (world) coordinates. */}
          <div
            className="absolute left-0 top-0"
            style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: "0 0" }}
          >
            <svg
              className="pointer-events-none absolute left-0 top-0"
              width={4000}
              height={4000}
              style={{ overflow: "visible" }}
            >
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
              const isSelected = selected?.type === "components" && selected.ids.has(comp.id);
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
          </div>

          {/* Box-select rectangle — drawn in screen space, on top of the
              transformed world content. */}
          {marquee && (
            <div
              className="pointer-events-none absolute border border-violet-400 bg-violet-400/10"
              style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
            />
          )}

          {components.length === 0 && (
            <p className="pointer-events-none absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-xs text-zinc-600">
              Drag parts from the menu above onto the canvas to start building.
            </p>
          )}

          {toast && (
            <div
              className={`pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md border px-3 py-1.5 font-mono text-xs shadow-lg ${
                toast.type === "success"
                  ? "border-emerald-900 bg-emerald-950/90 text-emerald-300"
                  : "border-red-900 bg-red-950/90 text-red-300"
              }`}
            >
              {toast.text}
            </div>
          )}

          <div className="absolute bottom-2 right-3 flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950/90 px-1.5 py-1 font-mono text-[10px] text-zinc-400">
            <button onClick={() => zoomBy(0.85)} className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white" title="Zoom out">
              −
            </button>
            <button
              onClick={resetView}
              className="min-w-[3.25rem] rounded px-1.5 py-0.5 text-center hover:bg-zinc-800 hover:text-white"
              title="Reset view"
            >
              {Math.round(viewport.scale * 100)}%
            </button>
            <button onClick={() => zoomBy(1.15)} className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white" title="Zoom in">
              +
            </button>
          </div>

          <p className="pointer-events-none absolute bottom-2 left-3 max-w-[70%] font-mono text-[10px] text-zinc-600">
            output&rarr;input to wire &middot; drag to box-select, shift-click to add &middot; space/middle-drag to pan, ctrl+scroll to
            zoom &middot; ctrl+z / ctrl+y to undo/redo
          </p>
        </div>
      </div>

      {modalOpen && <CreateChipModal onCancel={() => setModalOpen(false)} onConfirm={handleCreateChip} />}
      {importChipOpen && (
        <ImportChipModal onClose={() => setImportChipOpen(false)} onImport={handleImportChip} alreadyImportedIds={chipIds} />
      )}
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

function ImportChipModal({ onClose, onImport, alreadyImportedIds }) {
  const [chips, setChips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chips")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) setChips(data.chips);
        else setError("Couldn't load chips");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load chips");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[70vh] w-96 flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-5 font-mono text-sm text-zinc-200 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-white">Import Chip</h2>
        <p className="mb-3 text-[11px] text-zinc-500">Browsing every chip saved on the server. Search is coming soon.</p>
        <input
          disabled
          placeholder="search coming soon…"
          className="mb-3 w-full cursor-not-allowed rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-500 outline-none placeholder:text-zinc-600"
        />
        <div className="flex-1 space-y-1 overflow-y-auto">
          {loading && <p className="px-1 text-xs text-zinc-500">Loading chips…</p>}
          {error && <p className="px-1 text-xs text-red-400">{error}</p>}
          {!loading && !error && chips.length === 0 && (
            <p className="px-1 text-xs text-zinc-500">No chips have been saved yet — create one first.</p>
          )}
          {chips.map((chip) => {
            const alreadyImported = alreadyImportedIds.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => onImport(chip)}
                disabled={alreadyImported}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="h-4 w-4 shrink-0 rounded" style={{ backgroundColor: chip.color }} />
                <span className="flex-1 truncate">{chip.name}</span>
                <span className="shrink-0 text-[10px] text-zinc-500">
                  {chip.numInputs}&rarr;{chip.numOutputs}
                </span>
                {alreadyImported && <span className="shrink-0 text-[10px] text-zinc-600">added</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}