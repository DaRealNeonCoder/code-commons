import Link from "next/link";
import { notFound } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { PublicProfileContent } from "@/components/ProfileProgressiveSections";
import { getPublicProfile } from "@/lib/publicProfiles";

export async function generateMetadata({ params }) {
  const { userId } = await params;
  const data = await getPublicProfile(userId);
  if (!data) return { title: "Profile not found — CodeCommons" };
  return {
    title: `${data.profile.name} — CodeCommons`,
    description: `${data.profile.name}'s CodeCommons learning and published work profile.`,
  };
}

export default async function PublicProfilePage({ params }) {
  const { userId } = await params;
  const data = await getPublicProfile(userId);
  if (!data) notFound();

  const { profile, summary, content } = data;
  const completed = [...summary.completedPuzzles, ...summary.completedLessons];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="font-mono text-sm text-zinc-500"><span className="text-teal-400">~/</span>profile/{profile.id}</p>
        <section className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <UserAvatar image={profile.image || profile.defaultImage} name={profile.name} size="lg" scale={profile.scale} positionX={profile.positionX} positionY={profile.positionY} />
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-zinc-500">CodeCommons profile</p>
              <h1 className="mt-1 font-mono text-2xl text-white">{profile.name}</h1>
              <p className="mt-1 text-sm text-zinc-500">Member since {new Date(profile.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
            </div>
          </div>
        </section>
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><p className="font-mono text-xs text-zinc-500">published</p><p className="mt-1 font-mono text-2xl text-white">{summary.publishedCount}</p></div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><p className="font-mono text-xs text-zinc-500">completed</p><p className="mt-1 font-mono text-2xl text-white">{summary.completedCount}</p></div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><p className="font-mono text-xs text-zinc-500">likes received</p><p className="mt-1 font-mono text-2xl text-white">★ {summary.likes}</p></div>
        </section>
        <PublicProfileContent content={content} />
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="flex items-baseline justify-between gap-3 px-4 py-3">
            <h2 className="font-mono text-sm text-zinc-100">Completed work</h2>
            <span className="font-mono text-xs text-zinc-500">{completed.length} item{completed.length === 1 ? "" : "s"}</span>
          </div>
          {completed.length === 0 ? <p className="border-t border-zinc-800 px-4 py-4 text-sm text-zinc-500">No completed puzzles or lessons to show yet.</p> : (
            <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
              {completed.slice(0, 12).map((item) => (
                <li key={`${item.type}:${item.id}`}><Link href={item.href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800/50"><span className="truncate">{item.title}</span><span className="shrink-0 font-mono text-[10px] uppercase text-zinc-500">{item.type}</span></Link></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
