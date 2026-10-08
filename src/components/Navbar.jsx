"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthControl from "@/components/AuthControl";

export default function Navbar() {
  const pathname = usePathname();

  const isBrowse = pathname.startsWith("/browse");
  const isCreate = pathname.startsWith("/create");

  return (
    <header className="flex items-center justify-between bg-zinc-950 px-6 py-3.5 border-b border-zinc-800">
      <Link href="/" className="font-mono text-sm text-white">
        <span className="text-teal-400">~/</span>codecommons
      </Link>

      <nav className="flex items-center gap-6 font-mono text-sm">
        <Link
          href="/browse"
          className={`transition-colors ${
            isBrowse
              ? "text-amber-400"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          browse
        </Link>

        <Link
          href="/create"
          className={`transition-colors ${
            isCreate
              ? "text-violet-400"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          create
        </Link>

        <div className="border-l border-zinc-800 pl-6">
          <AuthControl />
        </div>
      </nav>
    </header>
  );
}
