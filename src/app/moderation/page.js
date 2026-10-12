import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canModerateItem, getModerationRole } from "@/lib/moderation";
import ModerationQueue from "@/components/moderation/ModerationQueue";

export default async function ModerationPage({ searchParams }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;
  const itemType = params?.itemType || null;
  const itemId = params?.itemId || null;
  const allowed = session?.user && (await getModerationRole(session.user.id) || (itemType && itemId && await canModerateItem(session.user.id, itemType, itemId)));
  if (!allowed) redirect("/");
  const query = itemType && itemId ? `?itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}` : "";
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="font-mono text-sm text-zinc-500"><span className="text-teal-400">~/</span>moderation</p>
        <h1 className="mt-2 font-mono text-2xl text-white">Comment moderation</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Review spam-filtered comments and community reports. Contributors can also receive moderation access for individual published items.</p>
        <ModerationQueue query={query} />
      </div>
    </main>
  );
}
