/** @jsxImportSource solid-js */

import type { JSX } from "solid-js";
import { createMemo, createSignal, Show } from "solid-js";
import { LazyImage } from "@/components/LazyImage";

type IconSource = string | null | undefined;

export function MatchCardAssetIcon(props: {
  src?: IconSource;
  fallbacks?: IconSource[];
  alt: string;
  className: string;
  fallbackClassName: string;
  loadingClassName?: string;
}): JSX.Element {
  const candidates = createMemo(() =>
    [...new Set([props.src, ...(props.fallbacks ?? [])])].filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    ),
  );
  const signature = createMemo(() => candidates().join("|"));
  const [state, setState] = createSignal({
    signature: "",
    index: 0,
  });
  const index = createMemo(() =>
    state().signature === signature() ? state().index : 0,
  );
  const current = createMemo(() => candidates()[index()] ?? null);

  return (
    <Show
      when={current()}
      fallback={<span class={props.fallbackClassName} aria-hidden="true" />}
    >
      {(src) => (
        <LazyImage
          src={src()}
          alt={props.alt}
          className={props.className}
          fallbackClassName={props.fallbackClassName}
          loadingClassName={props.loadingClassName ?? props.fallbackClassName}
          onError={() =>
            setState({
              signature: signature(),
              index: index() + 1,
            })
          }
        />
      )}
    </Show>
  );
}
