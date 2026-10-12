import UserAvatar from "@/components/UserAvatar";
import { getContentAuthor } from "@/lib/authors";

export default async function ContentAuthor({ itemType, itemId, tone = "light" }) {
  const author = await getContentAuthor(itemType, itemId);
  const dark = tone === "dark";

  return (
    <footer className={`mt-8 flex items-center gap-3 border-t pt-5 ${dark ? "border-zinc-800" : "border-zinc-200 dark:border-zinc-800"}`}>
      <UserAvatar image={author.image} name={author.name} size="sm" scale={author.scale} positionX={author.positionX} positionY={author.positionY} />
      <p className={`text-sm ${dark ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"}`}>
        made by <span className={dark ? "text-zinc-200" : "text-zinc-800 dark:text-zinc-200"}>{author.name}</span>
      </p>
    </footer>
  );
}
