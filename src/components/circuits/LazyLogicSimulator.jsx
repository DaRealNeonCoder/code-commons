"use client";

import dynamic from "next/dynamic";

const LogicSimulator = dynamic(() => import("@/components/circuits/LogicSimulator"), {
  ssr: false,
  loading: () => <div className="flex min-h-96 flex-1 items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-500">loading circuit simulator…</div>,
});

export default function LazyLogicSimulator(props) {
  return <LogicSimulator {...props} />;
}
