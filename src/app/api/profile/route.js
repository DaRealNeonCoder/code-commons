import { eq } from "drizzle-orm";
import { getRequestAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getUserAvatar } from "@/lib/profile";

const MAX_PROFILE_IMAGE_BYTES = 512 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

async function getUser(request) {
  return (await getRequestAccess(request)).user;
}

export async function GET(request) {
  const currentUser = await getUser(request);
  if (!currentUser) return Response.json({ error: "Not signed in." }, { status: 401 });
  return Response.json({ user: (await getUserAvatar(currentUser.id)) || currentUser });
}

export async function POST(request) {
  const access = await getRequestAccess(request);
  const currentUser = access.user;
  if (!currentUser) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (access.ban) return Response.json({ error: "Your account is restricted from interacting." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "A valid image upload is required." }, { status: 400 });

  const remove = form.get("remove") === "true";
  const imageData = typeof form.get("imageData") === "string" ? form.get("imageData") : null;
  const scale = clamp(Number(form.get("scale")), 1, 3, 1);
  const positionX = clamp(Number(form.get("positionX")), -50, 50, 0);
  const positionY = clamp(Number(form.get("positionY")), -50, 50, 0);
  let image = null;

  if (!remove) {
    const file = form.get("image");
    if (file && typeof file.arrayBuffer === "function") {
      if (!IMAGE_TYPES.has(file.type)) {
        return Response.json({ error: "Use a PNG, JPEG, WebP, or GIF image." }, { status: 400 });
      }
      if (file.size > MAX_PROFILE_IMAGE_BYTES) {
        return Response.json({ error: "Profile pictures must be 512 KB or smaller." }, { status: 400 });
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      image = `data:${file.type};base64,${bytes.toString("base64")}`;
    } else if (imageData) {
      const parsed = parseImageData(imageData);
      if (!parsed) return Response.json({ error: "Choose a valid image to upload." }, { status: 400 });
      image = parsed;
    } else {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }
  }

  const [updated] = await db
    .update(user)
    .set({
      customImage: image,
      customImageScale: remove ? 1 : scale,
      customImageX: remove ? 0 : positionX,
      customImageY: remove ? 0 : positionY,
      updatedAt: new Date(),
    })
    .where(eq(user.id, currentUser.id))
    .returning({ id: user.id, name: user.name });

  return Response.json({ user: (await getUserAvatar(updated.id)) || updated });
}

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function parseImageData(value) {
  const match = value.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  return bytes.length <= MAX_PROFILE_IMAGE_BYTES ? value : null;
}
