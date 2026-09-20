"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuthControl from "@/components/AuthControl";

const LANGUAGES = [
  { id: "python", label: "python", href: "/python", available: true },
  { id: "javascript", label: "javascript", available: false },
  { id: "java", label: "java", available: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPython = pathname.startsWith("/python");
  const isPuzzles = pathname.startsWith("/puzzles");
  const isCreate = pathname.startsWith("/create");

  return (
    <header className="flex items-center justify-between bg-zinc-950 px-6 py-3.5 border-b border-zinc-800">
      <Link href="/" className="font-mono text-sm text-white">
        <span className="text-teal-400">~/</span>codeloop
      </Link>

      <nav className="flex items-center gap-6 font-mono text-sm">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`transition-colors ${
              isPython ? "text-amber-400" : "text-zinc-400 hover:text-white"
            }`}
          >
            python <span className="text-zinc-600">▾</span>
          </button>

          {open && (
            <div className="absolute right-0 z-10 mt-3 w-44 rounded-md border border-zinc-800 bg-zinc-950 py-1 shadow-xl">
              {LANGUAGES.map((lang) =>
                lang.available ? (
                  <Link
                    key={lang.id}
                    href={lang.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-zinc-100 hover:bg-zinc-900"
                  >
                    {lang.label}
                  </Link>
                ) : (
                  <div key={lang.id} className="px-3 py-2 text-zinc-600 cursor-not-allowed">
                    {lang.label} <span className="text-zinc-700"># soon</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <Link
          href="/puzzles"
          className={`transition-colors ${
            isPuzzles ? "text-teal-400" : "text-zinc-400 hover:text-white"
          }`}
        >
          puzzles
        </Link>

        <Link
          href="/create"
          className={`transition-colors ${
            isCreate ? "text-violet-400" : "text-zinc-400 hover:text-white"
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
