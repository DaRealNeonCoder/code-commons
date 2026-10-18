import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";

import remarkCallouts from "@/lib/remark-callouts";
import remarkMermaid from "@/lib/remark-mermaid";

import Callout from "@/components/mdx/Callout";
import Details from "@/components/mdx/Details";
import Mermaid from "@/components/mdx/Mermaid";
import DemoPlayer from "@/components/mdx/DemoPlayer";
import Video from "@/components/mdx/Video";
import ReactDemo from "@/components/mdx/ReactDemo";

// Pass this into <MDXRemote options={{ mdxOptions }} /> anywhere content is
// rendered — lessons, puzzles, or any new section you add later.
export const mdxOptions = {
  remarkPlugins: [remarkGfm, remarkMath, remarkCallouts, remarkMermaid],
  rehypePlugins: [rehypeKatex, [rehypePrettyCode, { theme: "github-dark" }]],
};

// Pass this into <MDXRemote components={mdxComponents} />. It covers the
// custom tags (Callout, Details, Mermaid, DemoPlayer, Video) AND gives
// plain Markdown elements (headings, tables, links...) sensible styling,
// since Tailwind's reset otherwise strips their default look.
export const mdxComponents = {
  Callout,
  Details,
  Mermaid,
  DemoPlayer,
  Video,
  ReactDemo,

  h1: (props) => <h1 {...props} className="mt-8 mb-4 text-2xl font-semibold first:mt-0" />,
  h2: (props) => <h2 {...props} className="mt-8 mb-3 text-xl font-semibold first:mt-0" />,
  h3: (props) => <h3 {...props} className="mt-6 mb-2 text-lg font-semibold" />,
  p: (props) => (
    <p
      {...props}
      className={["mb-5 leading-8 text-zinc-700 dark:text-zinc-300", props.className]
        .filter(Boolean)
        .join(" ")}
    />
  ),
  ul: (props) => <ul {...props} className="mb-5 ml-5 list-disc space-y-2 leading-7 text-zinc-700 dark:text-zinc-300" />,
  ol: (props) => <ol {...props} className="mb-5 ml-5 list-decimal space-y-2 leading-7 text-zinc-700 dark:text-zinc-300" />,
  strong: (props) => <strong {...props} className="font-semibold" />,
  blockquote: (props) => (
    <blockquote
      {...props}
      className="my-6 border-l-4 border-amber-300 bg-amber-50/60 py-3 pl-4 pr-3 italic text-zinc-600 dark:border-amber-800 dark:bg-amber-950/20 dark:text-zinc-400"
    />
  ),
  table: (props) => <table {...props} className="my-4 w-full border-collapse text-sm" />,
  th: (props) => (
    <th {...props} className="border-b border-zinc-300 px-3 py-2 text-left font-semibold dark:border-zinc-700" />
  ),
  td: (props) => <td {...props} className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800" />,
  a: (props) => (
    <a {...props} className="text-teal-600 underline underline-offset-2 dark:text-teal-400" />
  ),
  // eslint-disable-next-line @next/next/no-img-element
  img: (props) => <img {...props} className="my-4 rounded-lg border border-zinc-200 dark:border-zinc-800" />,
  pre: (props) => <pre {...props} className="my-5 overflow-x-auto rounded-xl p-5 text-sm shadow-sm" />,
  code: (props) => {
    // rehype-pretty-code stamps its own <code> (inside <pre>) with
    // data-language — leave those alone so we don't clobber Shiki's
    // per-token inline colors. Anything else is inline `code` text.
    if (props["data-language"] !== undefined) {
      return <code {...props} />;
    }
    return (
      <code
        {...props}
        className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800"
      />
    );
  },
};
