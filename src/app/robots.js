import { absoluteUrl } from "@/lib/seo";

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/courses/", "/lessons/", "/puzzles/", "/profile/"] },
      { userAgent: "*", disallow: ["/api/", "/profile", "/moderation", "/create", "/notifications"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
