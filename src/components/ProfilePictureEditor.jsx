"use client";

import { useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";

export default function ProfilePictureEditor({ initialImage, name }) {
  const inputRef = useRef(null);
  const [image, setImage] = useState(initialImage || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("image", file);

    try {
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.user) throw new Error(data?.error || "Could not update your profile picture.");
      setImage(data.user.image || null);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: data.user }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("remove", "true");
    try {
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.user) throw new Error(data?.error || "Could not remove your profile picture.");
      setImage(null);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: data.user }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar image={image} name={name} size="lg" />
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-wide text-zinc-500">profile picture</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded border border-teal-500/50 px-3 py-1.5 font-mono text-xs text-teal-400 transition-colors hover:bg-teal-500/10 has-[:disabled]:cursor-wait has-[:disabled]:opacity-50">
            {busy ? "uploading..." : image ? "change picture" : "upload picture"}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={busy}
              onChange={(event) => upload(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {image && (
            <button type="button" onClick={remove} disabled={busy} className="rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 hover:border-zinc-500 hover:text-white disabled:opacity-50">
              remove
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500">PNG, JPEG, WebP, or GIF · 512 KB max</p>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
