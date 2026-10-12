"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotificationBell({ className = "", onClick }) {
  const [unread, setUnread] = useState(null);
  useEffect(() => {
    fetch("/api/notifications")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUnread(data?.unread ?? null))
      .catch(() => setUnread(null));
  }, []);
  return <Link href="/notifications" onClick={onClick} className={`relative font-mono text-sm transition-colors ${className}`} aria-label={`${unread ?? 0} unread notifications`}>
    <span>notifications</span>{unread > 0 && <span className="ml-1.5 rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-[10px] text-white">{unread > 99 ? "99+" : unread}</span>}
  </Link>;
}
