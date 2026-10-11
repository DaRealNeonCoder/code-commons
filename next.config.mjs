/** @type {import('next').NextConfig} */
const nextConfig = {
 reactStrictMode: false,
 // SharedArrayBuffer lets the Pyodide worker wait for a line of input without
 // blocking the editor's main thread.
 async headers() {
   return [{
     source: "/:path*",
     headers: [
       { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
       { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
     ],
   }];
 },
  /* config options here */
};

export default nextConfig;
