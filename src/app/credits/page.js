import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";

export const metadata = {
  title: "Puzzle credits and references — CodeCommons",
};

export default async function CreditsPage() {
  const documentPath = path.join(process.cwd(), "docs", "puzzle-attributions.md");
  const document = await fs.readFile(documentPath, "utf8");

  return (
    <div className="h-full w-full overflow-y-auto bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
          <Link href="/browse" className="text-teal-700 hover:underline dark:text-teal-400">
            browse
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span>credits</span>
        </div>

        <article className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
          <MDXRemote source={document} components={mdxComponents} options={{ mdxOptions, blockJS: false }} />
        </article>
      </div>
    </div>
  );
}
