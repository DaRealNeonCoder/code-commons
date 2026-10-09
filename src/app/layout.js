import "./globals.css";
import "katex/dist/katex.min.css";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "CodeCommons — learn Python, solve puzzles",
  description:
    "Interactive Python lessons and coding puzzles, right in your browser.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950">
        <Navbar />
        <main className="flex flex-1 min-h-0">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
