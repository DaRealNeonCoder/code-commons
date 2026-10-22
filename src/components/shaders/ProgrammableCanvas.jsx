"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createProgrammableNonce } from "@/lib/shaders/programmable3d";
import { createProgrammableRunnerDocument } from "@/lib/shaders/programmable3dRunner";

// WebGL startup is synchronous once the runner receives its project, but the
// sandboxed iframe can take a little while to boot on a cold page. Keep the
// watchdog long enough for that first boot without hiding real failures.
const RUN_TIMEOUT_MS = 10000;

export default function ProgrammableCanvas({ files, onError, onCompiled }) {
  const frameRef = useRef(null);
  const timerRef = useRef(null);
  const nonce = useMemo(() => createProgrammableNonce(), []);
  const documentSource = useMemo(() => createProgrammableRunnerDocument(), []);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("loading");
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    function armTimeout() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const message = "The graphics preview timed out and was reset.";
        setStatus("error");
        setError(message);
        onError?.(message);
        setFrameKey((key) => key + 1);
      }, RUN_TIMEOUT_MS);
    }

    function send() {
      setStatus("loading");
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
        send();
        return;
      }
      if (!event.data || event.data.nonce !== nonce) return;
      if (event.data.type === "programmable-3d:error") {
        clearTimeout(timerRef.current);
        setStatus("error");
        const file = event.data.file ? `${event.data.file}: ` : "";
        const message = `${file}${String(event.data.message || "Graphics preview failed.").slice(0, 700)}`;
        setError(message);
        onError?.(message);
      } else if (event.data.type === "programmable-3d:ready") {
        armTimeout();
        setStatus("ready");
        setError(null);
        onCompiled?.();
      } else if (event.data.type === "programmable-3d:frame") {
        armTimeout();
        setStatus("ready");
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

  return (
    <div className="relative h-full w-full bg-black" aria-busy={status === "loading"}>
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
      {status === "loading" && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-zinc-300 backdrop-blur-[1px]">
          <div className="w-full max-w-xs">
            <p className="font-mono text-xs uppercase tracking-[0.16em]">Loading graphics preview</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label="Loading graphics preview" aria-valuetext="Loading">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-fuchsia-400" />
            </div>
            <p className="mt-2 text-xs text-zinc-500">Starting the isolated WebGL runner…</p>
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
