import Link from "next/link";
import { getAllCircuits } from "@/lib/circuits/circuits";

export const metadata = {
  title: "Circuits — codeloop",
};

export default async function CircuitsIndexPage() {
  const circuits = await getAllCircuits();

  return (
    <div className="w-full h-full overflow-y-auto bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-violet-400">/circuits</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Logic Simulator</h1>
        <p className="mt-2 text-sm text-zinc-500">Pick a circuit lesson to open in the sandbox.</p>

        <div className="mt-8 space-y-3">
          {circuits.length === 0 && <p className="text-sm text-zinc-500">No circuits yet.</p>}
          {circuits.map((circuit) => (
            <Link
              key={circuit.id}
              href={circuit.available ? `/circuits/${circuit.id}` : "#"}
              aria-disabled={!circuit.available}
              className={`flex flex-col gap-1 rounded-md border px-4 py-3.5 transition-colors ${
                circuit.available
                  ? "border-zinc-800 text-zinc-100 hover:bg-zinc-900"
                  : "cursor-not-allowed border-zinc-800 text-zinc-600"
              }`}
            >
              <p className="font-medium">
                {circuit.title} {!circuit.available && <span className="font-mono text-xs">· coming soon</span>}
              </p>
              {circuit.summary && <p className="text-sm text-zinc-400">{circuit.summary}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}