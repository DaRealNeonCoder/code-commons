"use client";

import dynamic from "next/dynamic";

const ShaderPlayground = dynamic(() => import("./ShaderPlayground"), {
  ssr: false,
  loading: () => <div className="flex min-h-96 flex-1 items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-500">loading shader playground…</div>,
});

export default function LazyShaderPlayground(props) {
  return <ShaderPlayground {...props} />;
}
