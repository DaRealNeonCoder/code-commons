"use client";

import { useEffect, useRef, useState } from "react";
import { ShaderRuntime } from "@/lib/shaders/webgl";

// Renders whatever shader last compiled successfully, continuously, via
// requestAnimationFrame. `fragmentSource` changes trigger a recompile
// attempt; a failed recompile never interrupts the animation of the last
// good shader — see ShaderRuntime.setFragmentSource.
export default function ShaderCanvas({ fragmentSource, onError, onCompiled }) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const [initError, setInitError] = useState(null);

  // Create the WebGL runtime once and start the render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    let runtime;
    try {
      runtime = new ShaderRuntime(canvas);
    } catch (err) {
      setInitError(err.message);
      return;
    }
    runtimeRef.current = runtime;

    let rafId;
    const tick = (now) => {
      runtime.render(now);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, []);

  // Keep the canvas's drawing-buffer resolution matched to its container.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const observer = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(entry.contentRect.width * dpr));
      const height = Math.max(1, Math.round(entry.contentRect.height * dpr));
      if (width === canvas.width && height === canvas.height) return;
      canvas.width = width;
      canvas.height = height;
      runtimeRef.current?.resize(width, height);
    });
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // Recompile whenever the (already-debounced) source changes.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const result = runtime.setFragmentSource(fragmentSource);
    if (result.success) {
      onCompiled?.();
    } else {
      onError?.(result.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentSource]);

  function pointerPosition(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = canvas.height - (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  function handleMouseMove(e) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const { x, y } = pointerPosition(e);
    runtime.updateMouse({ x, y, clickX: runtime.mouse.clickX, clickY: runtime.mouse.clickY });
  }

  function handleMouseDown(e) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const { x, y } = pointerPosition(e);
    runtime.updateMouse({ x, y, clickX: x, clickY: y });
  }

  if (initError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-6 text-center text-sm text-red-400">
        Couldn&apos;t start WebGL: {initError}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      className="block h-full w-full bg-black"
    />
  );
}
