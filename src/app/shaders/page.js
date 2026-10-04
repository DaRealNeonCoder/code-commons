import Link from "next/link";
import { getAllShaders } from "@/lib/shaders/shaders";

export const metadata = {
  title: "Shaders — codeloop",
};

export default async function ShadersIndexPage() {
  const shaders = await getAllShaders();

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-fuchsia-600 dark:text-fuchsia-400">/shaders</p>
        <h1 className="mt-1 text-2xl font-semibold">Shader Playground</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Pick a shader lesson to open in the sandbox.
        </p>

        <div className="mt-8 space-y-3">
          {shaders.length === 0 && (
            <p className="text-sm text-zinc-500">No shaders yet.</p>
          )}

          {shaders.map((shader) => (
            <Link
              key={shader.id}
              href={shader.available ? `/shaders/${shader.id}` : "#"}
              aria-disabled={!shader.available}
              className={`flex flex-col gap-1 rounded-md border px-4 py-3.5 transition-colors ${
                shader.available
                  ? "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  : "cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
              }`}
            >
              <p className="font-medium">
                {shader.title}{" "}
                {!shader.available && (
                  <span className="font-mono text-xs">· coming soon</span>
                )}
              </p>

              {shader.summary && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {shader.summary}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}