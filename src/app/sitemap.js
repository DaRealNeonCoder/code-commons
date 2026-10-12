import { getAllCourses } from "@/lib/courses";
import { getLessons } from "@/lib/lessonStore";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap() {
  const [courses, lessons] = await Promise.all([getAllCourses(), getLessons()]);
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
  ];
}
