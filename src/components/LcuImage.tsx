import { convertFileSrc } from "@tauri-apps/api/core";
import { useMemo } from "react";
import { LazyImage } from "@/components/LazyImage";

type LcuImageProps = {
  src?: string | null;
  alt: string;
  className: string;
  fallbackClassName?: string;
  onError?: () => void;
};

function resolveLcuImageUrl(src?: string | null): string | null {
  if (typeof src !== "string") {
    return null;
  }

  const trimmed = src.trim();
  if (!trimmed) {
    return null;
  }

  // Already a fully qualified URL (http/https/data/blob/lcu/...).
  if (/^(https?|data|blob):\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("lcu://")
    ? resolvePathFromLcuUrl(trimmed)
    : trimmed.replace(/\\/g, "/");
  if (!normalizedPath) {
    return null;
  }

  const absolutePath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  if (canUseTauriConvertFileSrc()) {
    return convertFileSrc(absolutePath, "lcu");
  }

  return `lcu://league-client${encodeURI(absolutePath)}`;
}

function resolvePathFromLcuUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    return parsed.pathname.replace(/\\/g, "/");
  } catch {
    return null;
  }
}

function canUseTauriConvertFileSrc(): boolean {
  const candidate = (
    globalThis as {
      __TAURI_INTERNALS__?: { convertFileSrc?: unknown };
    }
  ).__TAURI_INTERNALS__;
  return typeof candidate?.convertFileSrc === "function";
}

export function LcuImage({
  src,
  alt,
  className,
  fallbackClassName,
  onError,
}: LcuImageProps) {
  const resolvedUrl = useMemo(() => resolveLcuImageUrl(src), [src]);

  if (!resolvedUrl) {
    if (!fallbackClassName) {
      return null;
    }
    return <span className={fallbackClassName} aria-hidden="true" />;
  }

  return (
    <LazyImage
      src={resolvedUrl}
      alt={alt}
      className={className}
      fallbackClassName={fallbackClassName}
      onError={onError}
    />
  );
}
