const ALLOWED_HOSTS = [
  "avatars.githubusercontent.com",
  "github.com",
  "lh3.googleusercontent.com",
];

export async function GET(request) {
  const source = request.nextUrl.searchParams.get("url");
  if (!source) return new Response("Missing image URL.", { status: 400 });

  let url;
  try {
    url = new URL(source);
  } catch {
    return new Response("Invalid image URL.", { status: 400 });
  }

  if (url.protocol !== "https:" || !ALLOWED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    return new Response("Image host is not supported.", { status: 400 });
  }

  const response = await fetch(url, { next: { revalidate: 3600 } }).catch(() => null);
  if (!response?.ok) return new Response("Could not load image.", { status: 404 });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return new Response("Invalid image response.", { status: 415 });

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
