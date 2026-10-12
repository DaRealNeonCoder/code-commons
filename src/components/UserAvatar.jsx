"use client";

import { useState } from "react";

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

export default function UserAvatar({ image, name, size = "sm", className = "", scale = 1, positionX = 0, positionY = 0 }) {
  const [failedImage, setFailedImage] = useState(null);
  const imageSrc = image?.startsWith("http")
    ? `/api/avatar?url=${encodeURIComponent(image)}`
    : image;

  const hasImage = Boolean(imageSrc && imageSrc !== failedImage);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 font-mono font-medium text-zinc-300 ${SIZES[size] || SIZES.sm} ${className}`}
      aria-hidden={hasImage ? undefined : "true"}
    >
      {hasImage ? (
        <img
          src={imageSrc}
          alt={`${name || "User"}'s profile picture`}
          className="absolute h-full w-full object-cover"
          style={{
            left: `calc(50% + ${positionX}%)`,
            top: `calc(50% + ${positionY}%)`,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center",
          }}
          onError={() => setFailedImage(imageSrc)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
