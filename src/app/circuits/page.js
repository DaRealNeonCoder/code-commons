import LogicSimulator from "@/components/circuits/LogicSimulator";

export default function CircuitsPage() {
  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-1 flex-col bg-zinc-950">
      <LogicSimulator />
    </main>
  );
}