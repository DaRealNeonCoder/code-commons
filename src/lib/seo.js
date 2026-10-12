export const SITE_URL = (
  process.env.SITE_URL || "https://code-commons.vercel.app"
).replace(/\/$/, "");

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, `${SITE_URL}/`).toString();
}

export function pageDescription(value, fallback) {
  const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

export function jsonLd(value) {
  return {
    __html: JSON.stringify(value).replace(/</g, "\\u003c"),
  };
}
