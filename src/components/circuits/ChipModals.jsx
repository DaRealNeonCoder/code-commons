"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { genId } from "@/lib/circuits/engine";

const PRESET_COLORS = ["#8b5cf6", "#0ea5e9", "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#ef4444", "#64748b"];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// The server adds listing-only fields to each chip. Strip them so they don't
// end up inside a circuit's saved chip definitions.
function toCompiledChip(chip) {
  const { mine, ownerName, visibility, ...compiled } = chip;
  // An import is a snapshot, not a live reference to the public listing. A
  // fresh local id also means deleting the source chip can never invalidate a
  // chip already embedded in this project.
  return { ...compiled, id: genId("localchip"), sourceId: chip.id };
}

/**
 * onConfirm(name, color, isPublic). isPublic is always false for signed-out
 * users, since the server only stores chips for signed-in accounts.
 */
export function CreateChipModal({ onCancel, onConfirm }) {
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);

  const [name, setName] = useState("My Chip");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [hexColor, setHexColor] = useState(PRESET_COLORS[0]);
  const [isPublic, setIsPublic] = useState(false); // private unless the user opts in

  const checked = signedIn && isPublic;
  const validColor = HEX_COLOR.test(hexColor);

  function selectColor(nextColor) {
    const normalized = nextColor.toLowerCase();
    setColor(normalized);
    setHexColor(normalized);
  }

  function editHexColor(value) {
    setHexColor(value);
    if (HEX_COLOR.test(value)) setColor(value.toLowerCase());
  }

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
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => selectColor(c)}
              className={`h-7 w-7 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-white" : ""}`}
              style={{ backgroundColor: c }}
              aria-label={`Use ${c}`}
            />
          ))}
        </div>
        <label className="mb-2 block text-xs text-zinc-500" htmlFor="chip-hex-color">
          Custom hex color
        </label>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => selectColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-950 p-0.5"
            aria-label="Choose a custom chip color"
          />
          <input
            id="chip-hex-color"
            value={hexColor}
            onChange={(e) => editHexColor(e.target.value)}
            maxLength={7}
            spellCheck="false"
            className={`min-w-0 flex-1 rounded-md border bg-zinc-950 px-2 py-1.5 text-sm text-white uppercase outline-none focus:border-violet-500 ${
              validColor ? "border-zinc-700" : "border-red-700"
            }`}
            aria-invalid={!validColor}
            aria-describedby="chip-hex-help"
          />
        </div>
        <p id="chip-hex-help" className="-mt-2 mb-4 text-[11px] text-zinc-500">
          Use a six-digit value such as #a855f7.
        </p>

        <label
          className={`mb-5 flex items-start gap-2 text-xs ${
            signedIn ? "cursor-pointer" : "cursor-not-allowed opacity-60"
          }`}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={!signedIn}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-violet-500"
          />
          <span>
            <span className="block text-zinc-200">Make this chip public</span>
            <span className="block text-[11px] text-zinc-500">
              {!signedIn
                ? "Sign in to save chips to the server. Until then it only exists in this session."
                : checked
                  ? "Anyone can find and import this chip."
                  : "Only you can import this chip."}
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            disabled={!validColor}
            onClick={() => onConfirm(name.trim() || "Chip", color, checked)}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImportChipModal({ onClose, onImport, alreadyImportedIds }) {
  const [chips, setChips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

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

  // Owner-only: flips one of your chips between public and private.
  async function toggleVisibility(chip) {
    const next = chip.visibility === "public" ? "private" : "public";
    setBusyId(chip.id);
    setNotice(null);
    try {
      const res = await fetch("/api/chips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chip.id, visibility: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error();
      setChips((prev) => prev.map((c) => (c.id === chip.id ? { ...c, visibility: next } : c)));
    } catch {
      setNotice(`Couldn't make "${chip.name}" ${next}`);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteServerChip(chip) {
    if (!window.confirm(`Delete "${chip.name}" from the shared chip library? Existing projects keep their local copies.`)) {
      return;
    }
    setBusyId(chip.id);
    setNotice(null);
    try {
      const res = await fetch("/api/chips", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chip.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error();
      setChips((prev) => prev.filter((c) => c.id !== chip.id));
      setNotice(`Deleted "${chip.name}" from the shared library. Your local copy is still available here.`);
    } catch {
      setNotice(`Couldn't delete "${chip.name}"`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[70vh] w-96 flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-5 font-mono text-sm text-zinc-200 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-white">Import Chip</h2>
        <p className="mb-3 text-[11px] text-zinc-500">
          Public chips from everyone, plus your own private ones. Search is coming soon.
        </p>
        <input
          disabled
          placeholder="search coming soon…"
          className="mb-3 w-full cursor-not-allowed rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-500 outline-none placeholder:text-zinc-600"
        />
        <div className="flex-1 space-y-1 overflow-y-auto">
          {loading && <p className="px-1 text-xs text-zinc-500">Loading chips…</p>}
          {error && <p className="px-1 text-xs text-red-400">{error}</p>}
          {notice && <p className="px-1 text-xs text-red-400">{notice}</p>}
          {!loading && !error && chips.length === 0 && (
            <p className="px-1 text-xs text-zinc-500">No chips have been saved yet — create one first.</p>
          )}
          {chips.map((chip) => {
            const alreadyImported = alreadyImportedIds.has(chip.id);
            return (
              <div key={chip.id} className="flex items-center gap-1 rounded-md hover:bg-zinc-800">
                <button
                  onClick={() => onImport(toCompiledChip(chip))}
                  disabled={alreadyImported}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="h-4 w-4 shrink-0 rounded" style={{ backgroundColor: chip.color }} />
                  <span className="flex-1 truncate">{chip.name}</span>
                  <span className="shrink-0 text-[10px] text-zinc-500">
                    {chip.numInputs}&rarr;{chip.numOutputs}
                  </span>
                  {alreadyImported && <span className="shrink-0 text-[10px] text-zinc-600">added</span>}
                </button>

                {chip.mine ? (
                  <div className="mr-1 flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleVisibility(chip)}
                      disabled={busyId === chip.id}
                      title={chip.visibility === "public" ? "Click to make private" : "Click to make public"}
                      className={`rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50 ${
                        chip.visibility === "public"
                          ? "border-emerald-700 text-emerald-400 hover:border-emerald-500"
                          : "border-zinc-600 text-zinc-400 hover:border-zinc-400"
                      }`}
                    >
                      {chip.visibility}
                    </button>
                    <button
                      onClick={() => deleteServerChip(chip)}
                      disabled={busyId === chip.id}
                      title="Delete this chip from the shared library"
                      aria-label={`Delete ${chip.name} from the shared library`}
                      className="rounded border border-red-900 px-1.5 py-0.5 text-[10px] text-red-400 hover:border-red-700 disabled:opacity-50"
                    >
                      delete
                    </button>
                  </div>
                ) : (
                  <span className="mr-2 max-w-[6rem] shrink-0 truncate text-[10px] text-zinc-500">
                    {chip.ownerName ? `by ${chip.ownerName}` : "public"}
                  </span>
                )}
              </div>
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
