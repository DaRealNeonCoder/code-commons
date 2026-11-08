import { getAllCourses } from "@/lib/courses";
import { getLessons } from "@/lib/lessonStore";
import { SYSTEM_OWNER } from "@/lib/db/lessons";
import { circuitStore, puzzleStore, shaderStore } from "@/lib/db/stores";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap() {
  // Only official, available content: user-made items are not listed here.
  const [courses, lessons, puzzles, circuits, shaders] = await Promise.all([
    getAllCourses(),
    getLessons(),
    puzzleStore.list({ ownerId: SYSTEM_OWNER, onlyAvailable: true }),
    circuitStore.list({ ownerId: SYSTEM_OWNER, onlyAvailable: true }),
    shaderStore.list({ ownerId: SYSTEM_OWNER, onlyAvailable: true }),
  ]);
  const now = new Date();

  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/browse"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    ...courses.map((course) => ({
      url: absoluteUrl(`/courses/${course.id}`),
      lastModified: course.updatedAt || now,
      changeFrequency: "weekly",
      priority: 0.9,
    })),
    ...lessons
      .filter((lesson) => lesson.available)
      .map((lesson) => ({
        url: absoluteUrl(`/lessons/${lesson.id}`),
        lastModified: lesson.updatedAt || now,
        changeFrequency: "monthly",
        priority: lesson.id === "binary-search-explained" ? 0.9 : 0.7,
      })),
    ...circuits.map((circuit) => ({
      url: absoluteUrl(`/circuits/${circuit.id}`),
      lastModified: circuit.updatedAt || now,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
    ...shaders.map((shader) => ({
      url: absoluteUrl(`/shaders/${shader.id}`),
      lastModified: shader.updatedAt || now,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
    ...puzzles.map((puzzle) => ({
      url: absoluteUrl(`/puzzles/${puzzle.id}`),
      lastModified: puzzle.updatedAt || now,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
  ];
}
