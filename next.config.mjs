/** @type {import('next').NextConfig} */
const nextConfig = {
 reactStrictMode: false,
 serverExternalPackages: ["esbuild"],
 // SharedArrayBuffer lets the Pyodide worker wait for a line of input without
 // blocking the editor's main thread.
 async headers() {
   return [{
     source: "/:path*",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        { key: "Content-Security-Policy", value: "frame-src 'self' https://code-commons-ccreact.vercel.app;" },
     ],
   }];
 },
  /* config options here */
};

export default nextConfig;
