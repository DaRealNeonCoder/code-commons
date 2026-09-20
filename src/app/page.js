/*
        TODO LIST

- Search system.
- Page orgainization.
- Course integration.
- Create system for puzzles.
- Actual puzzles with actual testing.
- Comment system?
- UI Overhaul
- Actual progress stats in profile. 

 */


import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full h-full overflow-y-auto">
      {/* Hero */}
      <section className="bg-zinc-950 px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-mono text-sm text-teal-400"># interactive coding, right in your browser</p>
            <h1 className="mt-4 font-mono text-4xl font-medium leading-tight text-white sm:text-5xl">
              build real things,
              <br />
              one line at a time.
            </h1>
            <p className="mt-5 max-w-md text-zinc-400">
              Work through short lessons, then put what you&apos;ve learned to the
              test with hands-on puzzles. No installs, no setup.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/lessons"
                className="rounded-md bg-amber-500 px-5 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
              >
                $ start lessons
              </Link>
              <Link
                href="/puzzles"
                className="rounded-md border border-zinc-700 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:border-teal-400 hover:text-teal-400"
              >
                $ open puzzles
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="ml-2 font-mono text-xs text-zinc-500">main.py</span>
            </div>
            <div className="px-5 py-7 font-mono text-sm leading-relaxed">
              <p>
                <span className="text-amber-400">print</span>
                <span className="text-zinc-500">(</span>
                <span className="text-teal-300">&quot;hello, world&quot;</span>
                <span className="text-zinc-500">)</span>
              </p>
              <p className="mt-3 text-green-400">
                hello, world<span className="ml-0.5 animate-pulse">▊</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <span className="font-mono text-sm text-zinc-400">01</span>
            <h2 className="mt-2 font-semibold">Pick a track</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Search or filter by area, topic, language, and difficulty.
            </p>
          </div>
          <div>
            <span className="font-mono text-sm text-zinc-400">02</span>
            <h2 className="mt-2 font-semibold">Learn by doing</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Every lesson has a real editor. Write code, run it, see the output.
            </p>
          </div>
          <div>
            <span className="font-mono text-sm text-zinc-400">03</span>
            <h2 className="mt-2 font-semibold">Put it to the test</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Head to Puzzles and solve challenges across a few categories.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}