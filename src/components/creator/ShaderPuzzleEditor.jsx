"use client";

import { useState } from "react";
import { renderShaderToDataUrl } from "@/lib/shaders/webgl";
import { getShaderPuzzle } from "@/lib/shaders/puzzle";

const fieldClass = "rounded border border-zinc-300 px-2 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950";
const DEFAULTS = { width: 96, height: 96, tolerance: 0.08, requiredMatch: 0.96, referenceImage: "" };

export default function ShaderPuzzleEditor({ enabled, onEnabledChange, puzzle, onPuzzleChange, code }) {
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const value = { ...DEFAULTS, ...(puzzle ?? {}) };

  function update(key, next) {
    onPuzzleChange({ ...value, [key]: next, ...(["width", "height"].includes(key) ? { referenceImage: "" } : {}) });
  }

  async function captureReference() {
    setCapturing(true);
    setCaptureError("");
    try {
      const image = renderShaderToDataUrl(code, value.width, value.height);
      onPuzzleChange(getShaderPuzzle({ ...value, referenceImage: image }));
    } catch (error) {
      setCaptureError(error.message || "The shader could not be rendered.");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <section className="mt-6 rounded-md border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm text-zinc-500">shader puzzle</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Turn this lesson into a visual challenge. Learners change the GLSL
            and must render an image close enough to the reference frame.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
          publish as shader puzzle
        </label>
      </div>

      {enabled && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Reference width
              <input
                type="number"
                min="16"
                max="512"
                value={value.width}
                onChange={(event) => update("width", Number(event.target.value))}
                className={`mt-1 w-full ${fieldClass}`}
              />
            </label>
            <label className="block text-sm font-medium">
              Reference height
              <input
                type="number"
                min="16"
                max="512"
                value={value.height}
                onChange={(event) => update("height", Number(event.target.value))}
                className={`mt-1 w-full ${fieldClass}`}
              />
            </label>
            <label className="block text-sm font-medium">
              Pixel tolerance
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={value.tolerance}
                onChange={(event) => update("tolerance", Number(event.target.value))}
                className={`mt-1 w-full ${fieldClass}`}
              />
              <span className="mt-1 block text-xs font-normal text-zinc-500">0 is exact; 0.08 allows small color differences.</span>
            </label>
            <label className="block text-sm font-medium">
              Required matching pixels
              <input
                type="number"
                min="0.5"
                max="1"
                step="0.01"
                value={value.requiredMatch}
                onChange={(event) => update("requiredMatch", Number(event.target.value))}
                className={`mt-1 w-full ${fieldClass}`}
              />
              <span className="mt-1 block text-xs font-normal text-zinc-500">How much of the image must be within tolerance.</span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <button
              type="button"
              onClick={captureReference}
              disabled={capturing || !code}
              className={`${fieldClass} text-zinc-700 hover:border-fuchsia-500 dark:text-zinc-200 disabled:opacity-50`}
            >
              {capturing ? "capturing…" : "capture current shader as target"}
            </button>
            <p className="text-sm text-zinc-500">
              First build the solution in the workspace and capture it here.
              Then replace the workspace code with the learner&apos;s starter code before publishing.
              The captured target stays saved. Checks use time 0, frame 0, and mouse (0, 0, 0, 0).
            </p>
          </div>

          {value.referenceImage && (
            <div className="mt-4 flex items-start gap-3">
              <img src={value.referenceImage} alt="Shader puzzle reference" className="h-24 w-24 rounded border border-zinc-300 bg-black object-contain dark:border-zinc-700" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Reference image captured and ready to publish.</p>
            </div>
          )}
          {captureError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{captureError}</p>}
        </>
      )}
    </section>
  );
}
