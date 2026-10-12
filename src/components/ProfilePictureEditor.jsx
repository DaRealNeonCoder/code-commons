"use client";

import { useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";

const MAX_BYTES = 512 * 1024;

export default function ProfilePictureEditor({ initialImage, defaultImage, initialCustomImage, name, initialScale = 1, initialPositionX = 0, initialPositionY = 0 }) {
  const inputRef = useRef(null);
  const [source, setSource] = useState(initialCustomImage || null);
  const [image, setImage] = useState(initialImage || defaultImage || null);
  const [custom, setCustom] = useState(Boolean(initialCustomImage));
  const [scale, setScale] = useState(initialScale);
  const [positionX, setPositionX] = useState(initialPositionX);
  const [positionY, setPositionY] = useState(initialPositionY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const cropRef = useRef(null);
  const dragRef = useRef(null);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function chooseFile(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Profile pictures must be 512 KB or smaller.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setSource(reader.result);
      setImage(reader.result);
      setCustom(true);
      setScale(1);
      setPositionX(0);
      setPositionY(0);
      setEditorOpen(true);
    };
    reader.onerror = () => setError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!source || busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("imageData", source);
    form.set("scale", String(scale));
    form.set("positionX", String(positionX));
    form.set("positionY", String(positionY));

    try {
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.user) throw new Error(data?.error || "Could not update your profile picture.");
      setImage(data.user.image || defaultImage || null);
      setSource(data.user.customImage || null);
      setCustom(Boolean(data.user.customImage));
      setScale(data.user.scale || 1);
      setPositionX(data.user.positionX || 0);
      setPositionY(data.user.positionY || 0);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: data.user }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("remove", "true");
    try {
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.user) throw new Error(data?.error || "Could not remove your profile picture.");
      setSource(null);
      setImage(data.user.image || defaultImage || null);
      setCustom(false);
      setScale(1);
      setPositionX(0);
      setPositionY(0);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: data.user }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startDragging(event) {
    if (event.button !== 0 || !cropRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      positionX,
      positionY,
    };
  }

  function drag(event) {
    const start = dragRef.current;
    const frame = cropRef.current;
    if (!start || !frame || start.pointerId !== event.pointerId) return;
    const bounds = frame.getBoundingClientRect();
    const deltaX = ((event.clientX - start.x) / bounds.width) * 100;
    const deltaY = ((event.clientY - start.y) / bounds.height) * 100;
    setPositionX(clamp(Math.round(start.positionX + deltaX), -50, 50));
    setPositionY(clamp(Math.round(start.positionY + deltaY), -50, 50));
  }

  function stopDragging(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function resetCrop() {
    setScale(1);
    setPositionX(0);
    setPositionY(0);
  }

  const previewImage = custom ? image : defaultImage || image;

  return (
    <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-start">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <UserAvatar image={previewImage} name={name} size="lg" scale={custom ? scale : 1} positionX={custom ? positionX : 0} positionY={custom ? positionY : 0} />
        <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-600">preview</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs uppercase tracking-wide text-zinc-500">profile picture</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded border border-teal-500/50 px-3 py-1.5 font-mono text-xs text-teal-400 transition-colors hover:bg-teal-500/10 has-[:disabled]:cursor-wait has-[:disabled]:opacity-50">
            {custom ? "choose another" : "upload picture"}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={busy}
              onChange={(event) => chooseFile(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {custom && (
            <>
              <button type="button" onClick={save} disabled={busy} className="rounded bg-teal-500 px-3 py-1.5 font-mono text-xs text-zinc-950 hover:bg-teal-400 disabled:opacity-50">
                {busy ? "saving..." : "save picture"}
              </button>
              <button type="button" onClick={remove} disabled={busy} className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 hover:border-zinc-500 hover:text-white disabled:opacity-50">
                use sign-in picture
              </button>
            </>
          )}
        </div>

          {custom && (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              disabled={busy}
              className="mt-4 rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-300 transition-colors hover:border-teal-400 hover:text-teal-300 disabled:opacity-50"
            >
              adjust position and zoom
            </button>
          )}

        <p className="mt-2 text-xs text-zinc-500">PNG, JPEG, WebP, or GIF · 512 KB max · square crop</p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {editorOpen && custom && source && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-picture-editor-title"
            className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-picture-editor-title" className="text-lg font-semibold text-white">Adjust profile picture</h2>
                <p className="mt-1 text-sm text-zinc-400">Drag the image to move it, then use zoom to frame it.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded px-2 py-1 text-xl leading-none text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label="Close picture editor"
              >
                ×
              </button>
            </div>

            <div
              ref={cropRef}
              onPointerDown={startDragging}
              onPointerMove={drag}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              className="relative mx-auto mt-5 aspect-square w-full max-w-xs cursor-grab touch-none overflow-hidden rounded-full border-2 border-teal-400 bg-zinc-950 active:cursor-grabbing"
              aria-label="Drag to position profile picture"
            >
              <img
                src={source}
                alt="Profile picture crop preview"
                draggable="false"
                className="pointer-events-none absolute h-full w-full select-none object-cover"
                style={{
                  left: `calc(50% + ${positionX}%)`,
                  top: `calc(50% + ${positionY}%)`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transformOrigin: "center",
                }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 font-mono text-xs text-zinc-400">
                <span className="flex justify-between gap-3">zoom <span className="text-zinc-600">{scale.toFixed(1)}×</span></span>
                <input type="range" min="1" max="3" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} className="accent-teal-400" />
              </label>
              <div className="flex justify-between gap-3 font-mono text-xs text-zinc-600">
                <span>horizontal {positionX}%</span>
                <span>vertical {positionY}%</span>
              </div>
            </div>

            <div className="mt-5 flex justify-between gap-2">
              <button type="button" onClick={resetCrop} className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 hover:border-zinc-500 hover:text-white">
                reset position
              </button>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded bg-teal-500 px-4 py-1.5 font-mono text-xs font-semibold text-zinc-950 hover:bg-teal-400">
                done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
