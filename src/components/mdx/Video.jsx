export default function Video({ src, caption }) {
  return (
    <figure className="my-4">
      <video src={src} controls className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800" />
      {caption && <figcaption className="mt-1 text-center text-xs text-zinc-500">{caption}</figcaption>}
    </figure>
  );
}
