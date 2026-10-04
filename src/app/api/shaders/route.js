// The old single global shader slot wrote to the server's disk and had no owner.
// Saving now happens through /create/shader (autosave + publish), so this is a
// harmless stub that keeps ShaderPlayground's mount-time fetch quiet. Delete this
// file once you've removed the load/save code from ShaderPlayground.
export async function GET() {
  return Response.json({ code: null });
}

export async function POST() {
  return Response.json(
    { error: "Saving here was removed. Use /create/shader to save and publish shaders." },
    { status: 410 }
  );
}
