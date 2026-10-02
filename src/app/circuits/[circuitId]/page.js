import { notFound } from "next/navigation";
import LogicSimulator from "@/components/circuits/LogicSimulator";
import MdxBody from "@/components/mdx/MdxBody";
import RatedShell from "@/components/rating/RatedShell";
import { getCircuitById } from "@/lib/circuits/circuits";

export async function generateMetadata({ params }) {
  const { circuitId } = await params;
  const circuit = getCircuitById(circuitId);
  return { title: circuit ? `${circuit.title} — codeloop` : "Circuit — codeloop" };
}

export default async function CircuitDetailPage({ params }) {
  const { circuitId } = await params;
  const circuit = getCircuitById(circuitId);
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

  let initialCircuit;
  try {
    initialCircuit = JSON.parse(circuit.starterCircuit);
  } catch {
    initialCircuit = { components: [], connections: [], chips: {} };
  }

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-1 flex-col bg-zinc-950">
      <RatedShell itemType="circuit" itemId={circuit.id} variant="dark">
        <LogicSimulator
          lessonTitle={circuit.title}
          lessonContent={<MdxBody source={circuit.content} />}
          initialCircuit={initialCircuit}
          showProjectIO={false}
        />
      </RatedShell>
    </main>
  );
}