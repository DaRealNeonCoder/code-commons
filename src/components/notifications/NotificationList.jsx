"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotificationList() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    fetch("/api/notifications").then((response) => response.json()).then((data) => {
      setItems(data.notifications || []);
      const ids = (data.notifications || []).filter((item) => !item.readAt).map((item) => item.id);
      if (ids.length) fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    }).catch(() => setItems([]));
  }, []);
  if (items === null) return <p className="mt-8 font-mono text-sm text-zinc-500">loading notifications...</p>;
  if (!items.length) return <p className="mt-8 font-mono text-sm text-zinc-500">No notifications yet.</p>;
  return <div className="mt-8 divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900">
    {items.map((item) => <div key={item.id} className={`p-4 ${item.readAt ? "" : "bg-fuchsia-500/5"}`}>
      {item.href ? <Link href={item.href} className="block hover:underline"><p className="font-mono text-sm text-zinc-100">{item.title}</p><p className="mt-1 text-sm text-zinc-400">{item.body}</p></Link> : <><p className="font-mono text-sm text-zinc-100">{item.title}</p><p className="mt-1 text-sm text-zinc-400">{item.body}</p></>}
    </div>)}
  </div>;
}
