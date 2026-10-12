"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AuthControl from "@/components/AuthControl";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isBrowse = pathname.startsWith("/browse");
  const isCreate = pathname.startsWith("/create");

  const linkClass = (active, activeClass = "text-amber-400") =>
    `transition-colors ${
      active ? activeClass : "text-zinc-400 hover:text-white"
    }`;

  return (
    <header className="relative z-30 shrink-0 border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 sm:px-6 sm:py-3.5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="min-w-0 truncate font-mono text-sm text-white"
        >
          <span className="text-teal-400">~/</span>codecommons
        </Link>

        <div className="flex shrink-0 items-center gap-3 font-mono text-sm">
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/browse" className={linkClass(isBrowse)}>
              browse
            </Link>

            <Link href="/create" className={linkClass(isCreate, "text-violet-400")}>
              create
            </Link>
          </nav>

          <div className="border-l border-zinc-800 pl-3 sm:pl-6">
            <AuthControl />
          </div>

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 text-lg text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white md:hidden"
          >
            <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>

      </div>

      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="mt-3 grid gap-1 border-t border-zinc-800 pt-3 font-mono text-sm md:hidden"
        >
          <Link
            href="/browse"
            onClick={() => setMobileOpen(false)}
            className={`rounded-md px-3 py-2.5 ${linkClass(isBrowse)}`}
          >
            browse
          </Link>
          <Link
            href="/create"
            onClick={() => setMobileOpen(false)}
            className={`rounded-md px-3 py-2.5 ${linkClass(isCreate, "text-violet-400")}`}
          >
            create
          </Link>
        </nav>
      )}
    </header>
  );
}
