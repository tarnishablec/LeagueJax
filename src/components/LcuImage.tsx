/** @jsxImportSource solid-js */
import { convertFileSrc } from "@tauri-apps/api/core";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { LazyImage } from "@/components/LazyImage";

type LcuImageProps = {
  src?: string | null;
  alt: string;
  className: string;
  fallbackClassName?: string;
  loadingClassName?: string;
  onError?: () => void;
  style?: JSX.CSSProperties;
};

function resolveLcuImageUrl(src?: string | null): string | null {
  if (typeof src !== "string") {
    return null;
  }

  const trimmed = src.trim();
  if (!trimmed) {
    return null;
  }

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

export function LcuImage(props: LcuImageProps) {
  const resolvedUrl = createMemo(() => resolveLcuImageUrl(props.src));

  return (
    <Show
      when={resolvedUrl()}
      fallback={
        props.fallbackClassName ? (
          <span
            class={props.fallbackClassName}
            style={props.style}
            aria-hidden="true"
          />
        ) : null
      }
    >
      {(url) => (
        <LazyImage
          src={url()}
          alt={props.alt}
          className={props.className}
          fallbackClassName={props.fallbackClassName}
          loadingClassName={props.loadingClassName}
          onError={props.onError}
          style={props.style}
        />
      )}
    </Show>
  );
}
