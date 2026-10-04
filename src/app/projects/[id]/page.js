import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { auth } from "@/lib/auth";
import { getBuildById } from "@/lib/codingProjects";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";
import RatedShell from "@/components/rating/RatedShell";

const LANGUAGE_IDS = ["python", "cpp", "rust"];
const LANGUAGE_LABEL = { python: "python", cpp: "c++", rust: "rust" };

// Public page for a PUBLISHED build (a row in the builds table). Drafts are not
// reachable here any more.
export default async function BuildPage({ params }) {
  const { id } = await params;

  const build = await getBuildById(id);
  if (!build) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const isOwner = Boolean(session?.user) && session.user.id === build.ownerId;

  // Stored JSON is still validated before it reaches the workspace.
  const saved = build.starterCode && typeof build.starterCode === "object" ? build.starterCode : {};
  const starterCode = {};
  for (const lang of LANGUAGE_IDS) {
    if (typeof saved[lang] === "string" && saved[lang].trim()) starterCode[lang] = saved[lang];
  }
  const languages = Object.keys(starterCode);
  if (languages.length === 0) starterCode.python = "";
  // One language filled in = the editor is locked to it; several = the picker shows.
  const lockedLanguage = languages.length <= 1 ? (languages[0] ?? "python") : undefined;

  const content = typeof build.content === "string" ? build.content : "";
  const title = build.title.trim() || "Untitled";
  const label = (languages.length ? languages : ["python"]).map((l) => LANGUAGE_LABEL[l]).join(", ");

  const description = (
    <article>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400"># {label}</p>
        {isOwner && build.projectId && (
          <Link
            href={`/create/project/${build.projectId}`}
            className="font-mono text-sm text-emerald-600 hover:underline dark:text-emerald-400"
          >
            edit project
          </Link>
        )}
      </div>
      <h1 className="mt-1 text-2xl font-semibold mb-4">{title}</h1>
      {content.trim() ? (
        <MDXRemote source={content} components={mdxComponents} options={{ mdxOptions }} />
      ) : (
        <p className="text-zinc-500">No description yet.</p>
      )}
    </article>
  );

  return (
    <RatedShell itemType="project" itemId={build.id}>
      <CodeWorkspace
        accent="emerald"
        fileBaseName="main"
        starterCode={starterCode}
        lockedLanguage={lockedLanguage}
        description={description}
        backHref={isOwner ? "/create" : undefined}
        backLabel="your projects"
        layoutToggle
      />
    </RatedShell>
  );
}
