"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotificationBell() {
  const [unread, setUnread] = useState(null);
  useEffect(() => {
    fetch("/api/notifications")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUnread(data?.unread ?? null))
      .catch(() => setUnread(null));
  }, []);
  if (unread === null) return null;
  return <Link href="/notifications" className="relative font-mono text-sm text-zinc-400 transition-colors hover:text-white" aria-label={`${unread} unread notifications`}>
    notifications{unread > 0 && <span className="ml-1.5 rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-[10px] text-white">{unread > 99 ? "99+" : unread}</span>}
  </Link>;
}
