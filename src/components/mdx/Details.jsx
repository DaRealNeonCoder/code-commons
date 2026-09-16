export default function Details({ title, children }) {
  return (
    <details className="my-4 rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <summary className="cursor-pointer select-none font-medium">{title}</summary>
      <div className="mt-2 text-sm">{children}</div>
    </details>
  );
}
