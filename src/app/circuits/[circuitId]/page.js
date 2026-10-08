import { notFound } from "next/navigation";
import LogicSimulator from "@/components/circuits/LogicSimulator";
import MdxBody from "@/components/mdx/MdxBody";
import RatedShell from "@/components/rating/RatedShell";
import { getCircuitById } from "@/lib/circuits/circuits";
import { parseCircuit, EMPTY_CIRCUIT } from "@/lib/circuits/circuitData";

export async function generateMetadata({ params }) {
  const { circuitId } = await params;
  const circuit = await getCircuitById(circuitId);
  return { title: circuit ? `${circuit.title} — codecommons` : "Circuit — codecommons" };
}

export default async function CircuitDetailPage({ params }) {
  const { circuitId } = await params;
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
