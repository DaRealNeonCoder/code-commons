import { readPublishRequest, saveErrorResponse } from "@/lib/publish";
import { notifyPublished } from "@/lib/notifications";

// For now, web lessons are stored through the project autosave mechanism
// This is a placeholder that mimics the shader-lessons pattern

export async function POST(request) {
  const p = await readPublishRequest(request, "web", "web", { categorised: false });
  if (p.response) return p.response;

  const html = typeof p.body.html === "string" ? p.body.html : "";
  const css = typeof p.body.css === "string" ? p.body.css : "";
  const js = typeof p.body.js === "string" ? p.body.js : "";

  // For now, we're just returning a success response
  // The actual storage happens through the project autosave
  // This can be enhanced later to store published versions separately

  const result = {
    ok: true,
    slug: p.project.id,
  };

  if (result.ok) {
    await notifyPublished({
      actorId: p.user.id,
      itemType: "web",
      itemId: result.slug,
      title: p.title
    });
  }

  return Response.json({ id: result.slug });
}
