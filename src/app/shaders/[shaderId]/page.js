import { notFound } from "next/navigation";
import ShaderPlayground from "@/components/shaders/ShaderPlayground";
import MdxBody from "@/components/mdx/MdxBody";
import RatedShell from "@/components/rating/RatedShell";
import { getShaderById } from "@/lib/shaders/shaders";
import CommentSection from "@/components/comments/CommentSection";

export async function generateMetadata({ params }) {
  const { shaderId } = await params;
  const shader = await getShaderById(shaderId)
  return { title: shader ? `${shader.title} — codecommons` : "Shader — codecommons" };
}

export default async function ShaderDetailPage({ params }) {
  const { shaderId } = await params;
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

  return (
    <RatedShell itemType="shader" itemId={shader.id} variant="dark">
      <ShaderPlayground
        lessonTitle={shader.title}
        lessonContent={
          <>
            <MdxBody source={shader.content} />
            <CommentSection itemType="shader" itemId={shader.id} tone="dark" />
          </>
        }
        initialCode={shader.starterCode}
      />
    </RatedShell>
  );
}
