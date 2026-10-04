// Helpers for the only two kinds of media lessons can reference:
//   - videos: YouTube only (stored as an 11-char video id, never a raw URL)
//   - images: only from hosts we control or explicitly allow

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

// Accepts a bare id or any common YouTube URL form and returns the id, or null.
//   parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")                   -> "dQw4w9WgXcQ"
//   parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=9") -> "dQw4w9WgXcQ"
//   parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")       -> "dQw4w9WgXcQ"
//   parseYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")      -> "dQw4w9WgXcQ"
export function parseYouTubeId(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (YOUTUBE_ID.test(value)) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(url.hostname)) return null;

  let id = null;
  if (url.hostname === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    const [, kind, maybeId] = url.pathname.split("/");
    if (kind === "embed" || kind === "shorts" || kind === "live") id = maybeId;
  }

  return id && YOUTUBE_ID.test(id) ? id : null;
}

// Privacy-friendly embed URL (no tracking cookies until the viewer plays it).
export function youTubeEmbedUrl(id) {
  if (!YOUTUBE_ID.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

// ---- images ----

// Vercel Blob public stores live on subdomains of this host.
const IMAGE_HOST_SUFFIXES = [".public.blob.vercel-storage.com"];
// Add exact hosts here if you ever want to allow another source.
const IMAGE_HOSTS = new Set([]);

export const ALLOWED_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Use this when saving a lesson that references an image URL, and before
// rendering one. Blocks http:, data:, javascript: and random third-party hosts
// (which would leak every viewer's IP to whoever runs that host).
export function isAllowedImageUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return (
    IMAGE_HOSTS.has(url.hostname) ||
    IMAGE_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
  );
}
