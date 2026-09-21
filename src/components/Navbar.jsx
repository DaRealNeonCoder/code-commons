"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthControl from "@/components/AuthControl";

export default function Navbar() {
  const pathname = usePathname();

  const isLessons = pathname.startsWith("/lessons") || pathname.startsWith("/courses");
  const isPuzzles = pathname.startsWith("/puzzles");
  const isShaders = pathname.startsWith("/shaders");
  const isCreate = pathname.startsWith("/create");

  return (
    <header className="flex items-center justify-between bg-zinc-950 px-6 py-3.5 border-b border-zinc-800">
      <Link href="/" className="font-mono text-sm text-white">
        <span className="text-teal-400">~/</span>codeloop
      </Link>

      <nav className="flex items-center gap-6 font-mono text-sm">
        <Link
          href="/lessons"
          className={`transition-colors ${isLessons ? "text-amber-400" : "text-zinc-400 hover:text-white"}`}
        >
          lessons
        </Link>

        <Link
          href="/puzzles"
          className={`transition-colors ${isPuzzles ? "text-teal-400" : "text-zinc-400 hover:text-white"}`}
        >
          puzzles
        </Link>

        <Link
          href="/shaders"
          className={`transition-colors ${isShaders ? "text-fuchsia-400" : "text-zinc-400 hover:text-white"}`}
        >
          shaders
        </Link>

        <Link
          href="/create"
          className={`transition-colors ${isCreate ? "text-violet-400" : "text-zinc-400 hover:text-white"}`}
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
