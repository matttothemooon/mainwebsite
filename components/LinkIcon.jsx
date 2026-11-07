"use client";

import { useEffect, useState } from "react";
import { resolveIcon } from "@/lib/icons";

export default function LinkIcon({ link }) {
  const icon = resolveIcon(link);
  const fallback = icon.favicon ? resolveIcon({}) : resolveIcon({ ...link, iconUrl: "" });
  const fallbackImage =
    fallback.type === "image" && fallback.src !== icon.src ? fallback.src : "";
  const [failedSrc, setFailedSrc] = useState("");

  useEffect(() => {
    setFailedSrc("");
  }, [icon.src]);

  const imageSrc = !failedSrc ? icon.src : failedSrc === icon.src ? fallbackImage : "";
  if (icon.type === "image" && imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied icon or favicon
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        onError={() => setFailedSrc(imageSrc)}
      />
    );
  }

  const fallbackPath = fallback.type === "path" ? fallback.path : resolveIcon({}).path;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={fallbackPath} />
    </svg>
  );
}
