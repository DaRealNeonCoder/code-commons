import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, user } from "@/lib/db/schema";

export const DEFAULT_AVATAR = {
  scale: 1,
  positionX: 0,
  positionY: 0,
};

/**
 * Better Auth stores the provider image in user.image. The most recently
 * updated OAuth account identifies the sign-in method that supplied it, while
 * customImage is always preferred when the person uploads an override.
 */
export async function getUserAvatar(userId) {
  const [profile, latestAccount] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        defaultImage: user.image,
        customImage: user.customImage,
        customImageScale: user.customImageScale,
        customImageX: user.customImageX,
        customImageY: user.customImageY,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1),
    db
      .select({ providerId: account.providerId, accountId: account.accountId })
      .from(account)
      .where(eq(account.userId, userId))
      .orderBy(desc(account.updatedAt), desc(account.createdAt))
      .limit(1),
  ]);

  const row = profile[0];
  if (!row) return null;

  const linkedAccount = latestAccount[0];
  const provider = linkedAccount?.providerId || null;
  // GitHub exposes a stable avatar endpoint keyed by the provider account ID.
  // This keeps the sign-in avatar available even for older accounts whose
  // user.image field was not populated during OAuth sign-in.
  const providerImage = row.defaultImage || (
    provider === "github" && linkedAccount?.accountId
      ? `https://avatars.githubusercontent.com/u/${encodeURIComponent(linkedAccount.accountId)}?v=4`
      : null
  );
  return {
    id: row.id,
    name: row.name,
    image: row.customImage || providerImage,
    defaultImage: providerImage,
    provider,
    customImage: row.customImage || null,
    scale: row.customImage ? Number(row.customImageScale || 1) : DEFAULT_AVATAR.scale,
    positionX: row.customImage ? Number(row.customImageX || 0) : DEFAULT_AVATAR.positionX,
    positionY: row.customImage ? Number(row.customImageY || 0) : DEFAULT_AVATAR.positionY,
  };
}
