"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createProgrammableNonce } from "@/lib/shaders/programmable3d";
import { createProgrammableRunnerDocument } from "@/lib/shaders/programmable3dRunner";

// Start-up covers creating the iframe, the WebGL context and the first compile.
// On a cold page that can be slow while the editor is still initializing, so
// the start-up window is generous. Once the scene is running, a stall means the
// render loop has stopped, which is a shorter window.
const BOOT_TIMEOUT_MS = 20000;
const RUN_TIMEOUT_MS = 10000;
// A stalled start is restarted quietly. Only repeated failures are reported,
// so a slow first boot doesn't flash errors in the editor.
const MAX_ATTEMPTS = 3;

// Each milestone is reported by the runner, so the bar moves when real work
// finishes. The bar hides on the first drawn frame, not on "ready".
const STAGES = {
  starting: { label: "Starting the isolated WebGL runner…", progress: 20 },
  compiling: { label: "Compiling your scene…", progress: 55 },
  drawing: { label: "Drawing the first frame…", progress: 85 },
};

export default function ProgrammableCanvas({ files, onError, onCompiled }) {
  const frameRef = useRef(null);
  const timerRef = useRef(null);
  const attemptRef = useRef(1);
  const nonce = useMemo(() => createProgrammableNonce(), []);
  const documentSource = useMemo(() => createProgrammableRunnerDocument(), []);
  const [error, setError] = useState(null);
  const [drawn, setDrawn] = useState(false);
  const [stage, setStage] = useState("starting");
  const [attempt, setAttempt] = useState(1);
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    // True once this iframe has set up the scene. Any later init message is
    // redundant (e.g. the load event firing after the boot handshake already ran).
    let ready = false;

    function armTimeout() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onStall, ready ? RUN_TIMEOUT_MS : BOOT_TIMEOUT_MS);
    }

    function onStall() {
      if (attemptRef.current < MAX_ATTEMPTS) {
        attemptRef.current += 1;
        setAttempt(attemptRef.current);
        setStage("starting");
        setDrawn(false);
        setFrameKey((key) => key + 1);
        return;
      }
      // Give up without remounting, so nothing keeps retrying in the background.
      // The next edit or page reload starts a fresh attempt.
      attemptRef.current = 1;
      setAttempt(1);
      const message = "The graphics preview did not respond after several attempts. Reload the page to try again.";
      setError(message);
      onError?.(message);
    }

    function send() {
      if (ready) return;
      frame.contentWindow?.postMessage({
        type: "programmable-3d:init",
        nonce,
        project: files,
      }, "*");
      armTimeout();
    }

    function onMessage(event) {
      if (event.source !== frame.contentWindow || event.origin !== "null") return;
      // srcDoc frames have an opaque origin and may finish booting before the
      // parent's effect subscribes to their load event. The boot handshake
      // makes the init message reliable in both cached and cold-load cases.
      if (event.data?.type === "programmable-3d:boot") {
        setStage("compiling");
        send();
        return;
      }
      if (!event.data || event.data.nonce !== nonce) return;
      if (event.data.type === "programmable-3d:error") {
        clearTimeout(timerRef.current);
        const file = event.data.file ? `${event.data.file}: ` : "";
        const message = `${file}${String(event.data.message || "Graphics preview failed.").slice(0, 700)}`;
        setError(message);
        onError?.(message);
      } else if (event.data.type === "programmable-3d:ready") {
        ready = true;
        attemptRef.current = 1;
        setAttempt(1);
        setStage("drawing");
        armTimeout();
        setError(null);
        onCompiled?.();
      } else if (event.data.type === "programmable-3d:frame") {
        ready = true;
        armTimeout();
        setDrawn(true);
      }
    }

    window.addEventListener("message", onMessage);
    frame.addEventListener("load", send);
    send();
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("message", onMessage);
      frame.removeEventListener("load", send);
    };
  }, [files, nonce, frameKey, onCompiled, onError]);

  const current = STAGES[stage];
  const showOverlay = !drawn && !error;

  return (
    <div className="relative h-full w-full bg-black" aria-busy={showOverlay}>
      <iframe
        key={frameKey}
        ref={frameRef}
        title="Programmable 3D graphics preview"
        srcDoc={documentSource}
        sandbox="allow-scripts"
        credentialless="true"
        referrerPolicy="no-referrer"
        className="block h-full w-full border-0"
      />
      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-zinc-300 backdrop-blur-[1px]">
          <div className="w-full max-w-xs">
            <p className="font-mono text-xs uppercase tracking-[0.16em]">
              {attempt > 1 ? `Restarting preview · attempt ${attempt} of ${MAX_ATTEMPTS}` : "Loading graphics preview"}
            </p>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"
              role="progressbar"
              aria-label="Loading graphics preview"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={current.progress}
            >
              <div
                className={`h-full rounded-full bg-fuchsia-400 transition-[width] duration-500 ease-out ${stage === "starting" ? "animate-pulse" : ""}`}
                style={{ width: `${current.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">{current.label}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 max-h-32 overflow-auto bg-black/80 p-3 font-mono text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
