import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

const MAX_PROFILE_IMAGE_BYTES = 512 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

async function getUser(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function GET(request) {
  const currentUser = await getUser(request);
  if (!currentUser) return Response.json({ error: "Not signed in." }, { status: 401 });
  const [profile] = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, currentUser.id))
    .limit(1);
  return Response.json({ user: profile || currentUser });
}

export async function POST(request) {
  const currentUser = await getUser(request);
  if (!currentUser) return Response.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "A valid image upload is required." }, { status: 400 });

  const remove = form.get("remove") === "true";
  let image = null;

  if (!remove) {
    const file = form.get("image");
    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    if (!IMAGE_TYPES.has(file.type)) {
      return Response.json({ error: "Use a PNG, JPEG, WebP, or GIF image." }, { status: 400 });
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      return Response.json({ error: "Profile pictures must be 512 KB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    image = `data:${file.type};base64,${bytes.toString("base64")}`;
  }

  const [updated] = await db
    .update(user)
    .set({ image, updatedAt: new Date() })
    .where(eq(user.id, currentUser.id))
    .returning({ id: user.id, name: user.name, image: user.image });

  return Response.json({ user: updated });
}
