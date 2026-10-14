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
  const pressedKeysRef = useRef(new Set());
  const cameraDragRef = useRef(null);
  const inputTimeRef = useRef(null);
  const [initError, setInitError] = useState(null);

  // Create the WebGL runtime once and start the render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    let runtime;
    try {
      runtime = new ShaderRuntime(canvas);
    } catch (err) {
      // Initialization is an external-system failure; surface it in the
      // component rather than throwing during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitError(err.message);
      return;
    }
    runtimeRef.current = runtime;

    let rafId;
    const tick = (now) => {
      const previousInputTime = inputTimeRef.current;
      inputTimeRef.current = now;
      if (previousInputTime != null && pressedKeysRef.current.size > 0) {
        const deltaSeconds = Math.min(0.1, (now - previousInputTime) / 1000);
        const speed = 0.9 * deltaSeconds / runtime.camera.zoom;
        let dx = 0;
        let dy = 0;
        const keys = pressedKeysRef.current;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= speed;
        if (keys.has("KeyD") || keys.has("ArrowRight")) dx += speed;
        if (keys.has("KeyW") || keys.has("ArrowUp")) dy += speed;
        if (keys.has("KeyS") || keys.has("ArrowDown")) dy -= speed;
        if (dx !== 0 || dy !== 0) runtime.moveCameraByWorld(dx, dy);
      }
      runtime.render(now);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    const pressedKeys = pressedKeysRef.current;
    const clearInput = () => {
      pressedKeys.clear();
      cameraDragRef.current = null;
      inputTimeRef.current = null;
    };
    const onVisibilityChange = () => {
      if (document.hidden) clearInput();
    };
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInput();
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

  // Wheel zoom is attached as a non-passive listener so the preview keeps the
  // page from scrolling while it is being explored. Zooming is anchored at
  // the cursor, which makes details under the pointer stay under the pointer.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e) {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const rect = canvas.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
      const factor = Math.exp(-e.deltaY * unit * 0.0015);
      runtime.zoomCameraAt(
        factor,
        e.clientX - rect.left,
        e.clientY - rect.top,
        rect.width,
        rect.height
      );
      e.preventDefault();
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
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

  function logicalPointerPosition(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function handlePointerMove(e) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const pointer = logicalPointerPosition(e);
    const drag = cameraDragRef.current;

    if (drag?.pointerId === e.pointerId) {
      runtime.panCameraByPixels(
        pointer.x - drag.x,
        pointer.y - drag.y,
        pointer.height
      );
      drag.x = pointer.x;
      drag.y = pointer.y;
    }

    const { x, y } = pointerPosition(e);
    runtime.updateMouse({ x, y, clickX: runtime.mouse.clickX, clickY: runtime.mouse.clickY });
  }

  function handlePointerDown(e) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    e.currentTarget.focus();

    const pointer = logicalPointerPosition(e);
    const cameraDrag = e.button === 1 || (e.button === 0 && e.shiftKey);
    if (cameraDrag) {
      e.preventDefault();
      cameraDragRef.current = { pointerId: e.pointerId, x: pointer.x, y: pointer.y };
    } else if (e.button === 0) {
      const { x, y } = pointerPosition(e);
      runtime.updateMouse({ x, y, clickX: x, clickY: y });
    } else {
      return;
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handlePointerUp(e) {
    const drag = cameraDragRef.current;
    if (drag?.pointerId === e.pointerId) cameraDragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handleKeyDown(e) {
    const runtime = runtimeRef.current;
    if (!runtime || e.ctrlKey || e.metaKey || e.altKey) return;

    const movementKey = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code);
    if (movementKey) {
      e.preventDefault();
      pressedKeysRef.current.add(e.code);
      return;
    }

    if (e.code === "Equal" || e.code === "NumpadAdd" || e.key === "+") {
      e.preventDefault();
      runtime.zoomCamera(1.15);
    } else if (e.code === "Minus" || e.code === "NumpadSubtract" || e.key === "-") {
      e.preventDefault();
      runtime.zoomCamera(1 / 1.15);
    } else if (e.code === "Digit0" || e.key === "0" || e.code === "KeyR") {
      e.preventDefault();
      runtime.resetCamera();
    }
  }

  function handleKeyUp(e) {
    pressedKeysRef.current.delete(e.code);
  }

  function handleCanvasBlur() {
    pressedKeysRef.current.clear();
    cameraDragRef.current = null;
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
      tabIndex={0}
      aria-label="Interactive shader preview. Focus this canvas to use keyboard camera controls."
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={() => { cameraDragRef.current = null; }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={handleCanvasBlur}
      className="block h-full w-full bg-black touch-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fuchsia-400"
    />
  );
}
