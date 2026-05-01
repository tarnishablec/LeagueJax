import type { CSSProperties } from "react";
import { useCallback, useState } from "react";
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

export function LazyImage({
  src,
  alt,
  className,
  fallbackClassName,
  loadingClassName,
  onError,
  style,
}: {
  src: string;
  alt: string;
  className: string;
  fallbackClassName?: string;
  loadingClassName?: string;
  onError?: () => void;
  style?: CSSProperties;
}) {
  const [visible, setVisible] = useState(false);
  const [errored, setErrored] = useState(false);

  const ref = useCallback((node: HTMLSpanElement | null) => {
    if (!node) return;
    listeners.set(node, () => setVisible(true));
    sharedObserver.observe(node);
    return () => {
      listeners.delete(node);
      sharedObserver.unobserve(node);
    };
  }, []);

  if (errored && !onError && fallbackClassName) {
    return (
      <span className={fallbackClassName} style={style} aria-hidden="true" />
    );
  }

  if (!visible) {
    return (
      <span
        ref={ref}
        className={`${className} ${imageFrame} ${loadingClassName ?? transparentPlaceholder}`}
        style={style}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={`${className} ${imageFrame} ${loadingClassName ?? transparentPlaceholder}`}
      style={style}
    >
      <img
        key={src}
        src={src}
        alt={alt}
        className={`${framedImage} ${lazyFadeIn}`}
        decoding="async"
        onLoad={(e) => {
          e.currentTarget.dataset.loaded = "";
        }}
        onError={() => {
          if (onError) {
            onError();
          } else {
            setErrored(true);
          }
        }}
      />
    </span>
  );
}
