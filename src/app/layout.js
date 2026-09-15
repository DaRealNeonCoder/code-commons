import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Codeloop — learn Python, solve puzzles",
  description: "Interactive Python lessons and coding puzzles, right in your browser.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950">
        <Navbar />
        <main className="flex flex-1 min-h-0">{children}</main>
      </body>
    </html>
  );
}