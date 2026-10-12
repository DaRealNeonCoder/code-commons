"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth-client";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function AuthControl() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (isPending) {
    // Reserve the space so the navbar doesn't jump once the session loads.
    return <span className="inline-block w-16" />;
  }

  if (!session) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md py-2 font-mono text-sm text-zinc-400 transition-colors hover:text-white"
        >
          sign in <span className="text-zinc-600">▾</span>
        </button>
        {open && (
          <div className="absolute right-0 z-10 mt-3 w-52 rounded-md border border-zinc-800 bg-zinc-950 py-1 shadow-xl">
            <button
              type="button"
              onClick={() =>
                authClient.signIn.social({ provider: "google", callbackURL: window.location.pathname })
              }
              className="block w-full px-3 py-2 text-left font-mono text-sm text-zinc-100 hover:bg-zinc-900"
            >
              continue with google
            </button>
            <button
              type="button"
              onClick={() =>
                authClient.signIn.social({ provider: "github", callbackURL: window.location.pathname })
              }
              className="block w-full px-3 py-2 text-left font-mono text-sm text-zinc-100 hover:bg-zinc-900"
            >
              continue with github
            </button>
          </div>
        )}
      </div>
    );
  }

  const label = session.user.name?.split(" ")[0]?.toLowerCase() || "account";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="max-w-32 truncate rounded-md py-2 font-mono text-sm text-zinc-400 transition-colors hover:text-white sm:max-w-none"
      >
        {label} <span className="text-zinc-600">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-md border border-zinc-800 bg-zinc-950 py-1 shadow-xl">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block w-full px-3 py-2 text-left font-mono text-sm text-zinc-100 hover:bg-zinc-900"
          >
            profile
          </Link>
          <NotificationBell
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm text-zinc-100 hover:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => authClient.signOut()}
            className="block w-full px-3 py-2 text-left font-mono text-sm text-zinc-100 hover:bg-zinc-900"
          >
            sign out
          </button>
        </div>
      )}
    </div>
  );
}
