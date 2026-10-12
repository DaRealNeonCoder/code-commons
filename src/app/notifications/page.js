import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import NotificationList from "@/components/notifications/NotificationList";

export default async function NotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");
  return <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-950"><div className="mx-auto max-w-3xl px-6 py-12">
    <p className="font-mono text-sm text-zinc-500"><span className="text-teal-400">~/</span>notifications</p>
    <h1 className="mt-2 font-mono text-2xl text-white">Notifications</h1>
    <NotificationList />
  </div></main>;
}
