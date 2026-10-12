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
          <div className="mt-4 grid max-w-md gap-3 rounded border border-zinc-800 bg-zinc-950 p-3">
            <label className="grid gap-1.5 font-mono text-xs text-zinc-400">
              zoom <span className="text-zinc-600">{scale.toFixed(1)}×</span>
              <input type="range" min="1" max="3" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} className="accent-teal-400" />
            </label>
            <label className="grid gap-1.5 font-mono text-xs text-zinc-400">
              horizontal position <span className="text-zinc-600">{positionX}%</span>
              <input type="range" min="-50" max="50" step="1" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} className="accent-teal-400" />
            </label>
            <label className="grid gap-1.5 font-mono text-xs text-zinc-400">
              vertical position <span className="text-zinc-600">{positionY}%</span>
              <input type="range" min="-50" max="50" step="1" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} className="accent-teal-400" />
            </label>
          </div>
        )}

        <p className="mt-2 text-xs text-zinc-500">PNG, JPEG, WebP, or GIF · 512 KB max · square crop</p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
