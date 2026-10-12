const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-xl",
};

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] || "?").toUpperCase();
}

export default function UserAvatar({ image, name, size = "sm", className = "" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 font-mono font-medium text-zinc-300 ${SIZES[size] || SIZES.sm} ${className}`}
      aria-hidden={image ? undefined : "true"}
    >
      {image ? (
        <img src={image} alt={`${name || "User"}'s profile picture`} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
