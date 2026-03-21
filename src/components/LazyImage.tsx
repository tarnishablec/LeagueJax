import { useCallback, useState } from "react";

export function LazyImage({
  src,
  alt,
  className,
  fallbackClassName,
  onError,
}: {
  src: string;
  alt: string;
  className: string;
  fallbackClassName?: string;
  onError?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const ref = useCallback((node: HTMLImageElement | HTMLSpanElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(node);
  }, []);

  if (errored && !onError && fallbackClassName) {
    return <span className={fallbackClassName} aria-hidden="true" />;
  }

  if (!visible) {
    return (
      <span
        ref={ref as (node: HTMLSpanElement | null) => void}
        className={fallbackClassName ?? className}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      key={src}
      ref={ref as (node: HTMLImageElement | null) => void}
      src={src}
      alt={alt}
      className={className}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (onError) {
          onError();
        } else {
          setErrored(true);
        }
      }}
      style={{
        opacity: loaded ? 1 : 0,
        transition: "opacity 200ms ease-in",
      }}
    />
  );
}
