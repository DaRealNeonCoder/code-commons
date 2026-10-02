// PUT AT: app/projects/[id]/page.js (NEW file; create the folders app/projects/[id]/ if they don't exist)

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";

const LANGUAGE_IDS = ["python", "cpp", "rust"];

export default async function CodingProjectPage({ params }) {
  const { id } = await params;

  const project = getProject(id);
  if (!project || project.type !== "project") notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const isOwner = session?.user?.id === project.userId;

  // Saved data is untrusted JSON, so validate before handing it to the workspace.
  const data = project.data;
  const language = LANGUAGE_IDS.includes(data.language) ? data.language : "python";
  const starterCode = typeof data.starterCode === "string" ? data.starterCode : "";
  const content = typeof data.content === "string" ? data.content : "";
  const title = project.title.trim() || "Untitled";

  const description = (
    <article>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400"># {language}</p>
        {isOwner && (
          <Link
            href={`/create/project/${project.id}`}
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
    <CodeWorkspace
      accent="emerald"
      fileBaseName="main"
      starterCode={{ [language]: starterCode }}
      lockedLanguage={language}
      description={description}
      backHref={isOwner ? "/create" : undefined}
      backLabel="your projects"
      layoutToggle
    />
  );
}