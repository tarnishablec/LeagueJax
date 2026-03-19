import { useState } from "react";

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
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() =>
        setState({
          signature,
          index: index + 1,
        })
      }
    />
  );
}
