import { notFound } from "next/navigation";
import LogicSimulator from "@/components/circuits/LazyLogicSimulator";
import MdxBody from "@/components/mdx/MdxBody";
import RatedShell from "@/components/rating/RatedShell";
import { getCircuitById } from "@/lib/circuits/circuits";
import { parseCircuit, EMPTY_CIRCUIT } from "@/lib/circuits/circuitData";
import { getPuzzlePorts } from "@/lib/circuits/puzzle";
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
  const { circuitId } = await params;
  const circuit = await getCircuitById(circuitId);
  return { title: circuit ? `${circuit.title} — codecommons` : "Circuit — codecommons" };
}

export default async function CircuitDetailPage({ params, searchParams }) {
  const { circuitId } = await params;
  const query = await searchParams;
  const circuit = await getCircuitById(circuitId);
  if (!circuit) notFound();

  if (!circuit.available) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-zinc-950 px-6">
        <div className="text-center">
          <p className="font-mono text-sm text-zinc-400">{circuit.title}</p>
          <p className="mt-2 text-zinc-400">This circuit is coming soon.</p>
        </div>
      </div>
    );
  }

  // starterCircuit is jsonb now (an object), but it's still validated before use.
  const initialCircuit = parseCircuit(circuit.starterCircuit) ?? EMPTY_CIRCUIT;
  const puzzle = circuit.puzzlePorts ? getPuzzlePorts(circuit.puzzlePorts, initialCircuit) : null;
  const lessonId = typeof query?.lesson === "string" ? query.lesson : null;
  const requestedCourseId = typeof query?.course === "string" ? query.course : null;
  const nextPuzzle = lessonId ? await getNextPuzzleInChain(lessonId, circuit.id, "circuit") : null;
  const ctx = lessonId ? await getCourseContext(lessonId, circuit.id, requestedCourseId, "circuit") : null;
  const userId = ctx ? await getCurrentUserId() : null;
  const progress = ctx ? await getCourseProgress(userId, ctx.outline) : null;

  return (
    <CourseShell outline={ctx?.outline} progress={progress} lessonId={lessonId} puzzleId={circuit.id} puzzleType="circuit">
      <main className="flex min-h-0 flex-1 flex-col bg-zinc-950">
        <RatedShell itemType="circuit" itemId={circuit.id} variant="dark">
          <LogicSimulator
            key={circuit.id}
            lessonTitle={circuit.title}
            lessonContent={
              <>
                <MdxBody source={circuit.content} />
                <NextPuzzleLinks puzzle={nextPuzzle} lessonId={lessonId} courseId={ctx?.outline.id} />
                {ctx && !nextPuzzle && <NextLessonLink course={ctx.outline} nextLesson={ctx.nextLesson} />}
                <CommentSection itemType="circuit" itemId={circuit.id} tone="dark" />
                <ContentAuthor itemType="circuit" itemId={circuit.id} tone="dark" />
              </>
            }
            initialCircuit={initialCircuit}
            aiContext={circuit.content}
            contextType="circuit"
            contextTitle={circuit.title}
            puzzleId={circuit.id}
            puzzle={puzzle}
            showProjectIO={false}
          />
        </RatedShell>
      </main>
    </CourseShell>
  );
}
