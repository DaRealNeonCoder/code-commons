// Stub for load/save. Web projects are saved through /create/web autosave.
// This is just a placeholder for the WebPlayground's mount-time fetch.
export async function GET() {
  return Response.json({ html: null, css: null, js: null });
}

export async function POST() {
  return Response.json(
    { error: "Saving here was removed. Use /create/web to save and publish web projects." },
    { status: 410 }
  );
}
