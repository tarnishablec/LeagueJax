/** @jsxImportSource solid-js */

import type { JSX } from "solid-js";
import { createSignal, onCleanup, Show } from "solid-js";
import {
  framedImage,
  imageFrame,
  lazyFadeIn,
  transparentPlaceholder,
} from "./LazyImage.css.ts";

const listeners = new Map<Element, () => void>();

const sharedObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const callback = listeners.get(entry.target);
      if (callback) {
        callback();
        listeners.delete(entry.target);
        sharedObserver.unobserve(entry.target);
      }
    }
  }
});

export function LazyImage(props: {
  src: string;
  alt: string;
  className: string;
  fallbackClassName?: string;
  loadingClassName?: string;
  onError?: () => void;
  style?: JSX.CSSProperties;
}) {
  const [visible, setVisible] = createSignal(false);
  const [errored, setErrored] = createSignal(false);
  let placeholder: HTMLSpanElement | undefined;

  const observe = (node: HTMLSpanElement) => {
    placeholder = node;
    listeners.set(node, () => setVisible(true));
    sharedObserver.observe(node);
  };

  onCleanup(() => {
    if (!placeholder) {
      return;
    }
    listeners.delete(placeholder);
    sharedObserver.unobserve(placeholder);
  });

  return (
    <Show
      when={!(errored() && !props.onError && props.fallbackClassName)}
      fallback={
        <span
          class={props.fallbackClassName}
          style={props.style}
          aria-hidden="true"
        />
      }
    >
      <Show
        when={visible()}
        fallback={
          <span
            ref={observe}
            class={`${props.className} ${imageFrame} ${props.loadingClassName ?? transparentPlaceholder}`}
            style={props.style}
            aria-hidden="true"
          />
        }
      >
        <span
          class={`${props.className} ${imageFrame} ${props.loadingClassName ?? transparentPlaceholder}`}
          style={props.style}
        >
          <img
            src={props.src}
            alt={props.alt}
            class={`${framedImage} ${lazyFadeIn}`}
            decoding="async"
            onLoad={(event) => {
              event.currentTarget.dataset.loaded = "";
            }}
            onError={() => {
              if (props.onError) {
                props.onError();
              } else {
                setErrored(true);
              }
            }}
          />
        </span>
      </Show>
    </Show>
  );
}
