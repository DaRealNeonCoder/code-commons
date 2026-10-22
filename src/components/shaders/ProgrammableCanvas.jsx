"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createProgrammableNonce } from "@/lib/shaders/programmable3d";
import { createProgrammableRunnerDocument } from "@/lib/shaders/programmable3dRunner";

const RUN_TIMEOUT_MS = 2500;

export default function ProgrammableCanvas({ files, onError, onCompiled }) {
  const frameRef = useRef(null);
  const timerRef = useRef(null);
  const nonce = useMemo(() => createProgrammableNonce(), []);
  const documentSource = useMemo(() => createProgrammableRunnerDocument(), []);
  const [error, setError] = useState(null);
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    function armTimeout() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const message = "The graphics preview timed out and was reset.";
        setError(message);
        onError?.(message);
        setFrameKey((key) => key + 1);
      }, RUN_TIMEOUT_MS);
    }

    function send() {
      frame.contentWindow?.postMessage({
        type: "programmable-3d:init",
        nonce,
        project: files,
      }, "*");
      armTimeout();
    }

    function onMessage(event) {
      if (event.source !== frame.contentWindow || event.origin !== "null") return;
      if (!event.data || event.data.nonce !== nonce) return;
      if (event.data.type === "programmable-3d:error") {
        clearTimeout(timerRef.current);
        const file = event.data.file ? `${event.data.file}: ` : "";
        const message = `${file}${String(event.data.message || "Graphics preview failed.").slice(0, 700)}`;
        setError(message);
        onError?.(message);
      } else if (event.data.type === "programmable-3d:ready") {
        armTimeout();
        setError(null);
        onCompiled?.();
      } else if (event.data.type === "programmable-3d:frame") {
        armTimeout();
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
    <div className="relative h-full w-full bg-black">
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
      {error && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 max-h-32 overflow-auto bg-black/80 p-3 font-mono text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
