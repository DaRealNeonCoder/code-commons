"use client";

import Link from "next/link";

export default function Error({ reset }) {
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-lg text-center">
        <p className="font-mono text-sm text-rose-600 dark:text-rose-400">/error</p>
        <h1 className="mt-3 font-mono text-3xl font-medium tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          something went wrong.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          This page hit an unexpected problem. Try loading it again, or head back to
          the home page.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-amber-400 px-4 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-4 py-2.5 font-mono text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-white"
          >
            go home
          </Link>
        </div>
      </div>
    </div>
  );
}
