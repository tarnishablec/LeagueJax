import { useState } from "react";
import { LazyImage } from "@/components/LazyImage";

type IconSource = string | null | undefined;

export function MatchCardAssetIcon({
  src,
  fallbacks = [],
  alt,
  className,
  fallbackClassName,
}: {
  src?: IconSource;
  fallbacks?: IconSource[];
  alt: string;
  className: string;
  fallbackClassName: string;
}) {
  const candidates = [...new Set([src, ...fallbacks])].filter(
    (value): value is string => {
      return typeof value === "string" && value.trim().length > 0;
    },
  );
  const signature = candidates.join("|");
  const [state, setState] = useState({
    signature: "",
    index: 0,
  });
  const index = state.signature === signature ? state.index : 0;
  const current = candidates[index] ?? null;

  if (!current) {
    return <span className={fallbackClassName} aria-hidden="true" />;
  }

  return (
    <LazyImage
      src={current}
      alt={alt}
      className={className}
      fallbackClassName={fallbackClassName}
      onError={() =>
        setState({
          signature,
          index: index + 1,
        })
      }
    />
  );
}
