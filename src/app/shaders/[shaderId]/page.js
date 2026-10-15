import { notFound } from "next/navigation";
import ShaderPlayground from "@/components/shaders/LazyShaderPlayground";
import MdxBody from "@/components/mdx/MdxBody";
import RatedShell from "@/components/rating/RatedShell";
import { getShaderById } from "@/lib/shaders/shaders";
import { getShaderPuzzle } from "@/lib/shaders/puzzle";
import { getNextPuzzleInChain } from "@/lib/lessonPuzzles";
import { getCourseContext } from "@/lib/courseNav";
import { getCurrentUserId } from "@/lib/session";
import { getCourseProgress } from "@/lib/courseProgress";
import CourseShell from "@/components/CourseShell";
import NextPuzzleLinks from "@/components/NextPuzzleLinks";
import NextLessonLink from "@/components/NextLessonLink";
import CommentSection from "@/components/comments/CommentSection";
import ContentAuthor from "@/components/ContentAuthor";

export async function generateMetadata({ params }) {
  const { shaderId } = await params;
  const shader = await getShaderById(shaderId)
  return { title: shader ? `${shader.title} — codecommons` : "Shader — codecommons" };
}

export default async function ShaderDetailPage({ params, searchParams }) {
  const { shaderId } = await params;
  const query = await searchParams;
  const shader = await getShaderById(shaderId)
  if (!shader) notFound();

  if (!shader.available) {
    return (
      <div className="flex w-full h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="font-mono text-sm text-zinc-400">{shader.title}</p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">This shader is coming soon.</p>
        </div>
      </div>
    );
  }

  const puzzle = shader.puzzleConfig ? getShaderPuzzle(shader.puzzleConfig) : null;
  const lessonId = typeof query?.lesson === "string" ? query.lesson : null;
  const requestedCourseId = typeof query?.course === "string" ? query.course : null;
  const nextPuzzle = lessonId ? await getNextPuzzleInChain(lessonId, shader.id, "shader") : null;
  const ctx = lessonId ? await getCourseContext(lessonId, shader.id, requestedCourseId, "shader") : null;
  const userId = ctx ? await getCurrentUserId() : null;
  const progress = ctx ? await getCourseProgress(userId, ctx.outline) : null;

  return (
    <CourseShell outline={ctx?.outline} progress={progress} lessonId={lessonId} puzzleId={shader.id} puzzleType="shader">
      <RatedShell itemType="shader" itemId={shader.id} variant="dark">
        <ShaderPlayground
          lessonTitle={shader.title}
          lessonContent={
            <>
              <MdxBody source={shader.content} />
              <NextPuzzleLinks puzzle={nextPuzzle} lessonId={lessonId} courseId={ctx?.outline.id} />
              {ctx && !nextPuzzle && <NextLessonLink course={ctx.outline} nextLesson={ctx.nextLesson} />}
              <CommentSection itemType="shader" itemId={shader.id} tone="dark" />
              <ContentAuthor itemType="shader" itemId={shader.id} tone="dark" />
            </>
          }
          initialCode={shader.starterCode}
          aiContext={shader.content}
          contextType="shader"
          contextTitle={shader.title}
          puzzle={puzzle}
          puzzleId={puzzle ? shader.id : null}
        />
      </RatedShell>
    </CourseShell>
  );
}
