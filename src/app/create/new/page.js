import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PROJECT_TYPES } from "@/lib/creatorTypes";
import NewProjectCard from "@/components/creator/NewProjectCard";

export default async function NewProjectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/create" className="font-mono text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          ← /create
        </Link>
        <p className="mt-3 font-mono text-sm text-violet-600 dark:text-violet-400">/create/new</p>
        <h1 className="mt-1 text-2xl font-semibold">What are you creating?</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Pick a type to get started.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PROJECT_TYPES.map((type) => (
            <NewProjectCard key={type.id} type={type} />
          ))}
        </div>
      </div>
    </div>
  );
}