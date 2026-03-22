import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import * as s from "./CopyButton.css";

export function CopyButton({
  text,
  className,
  "aria-label": ariaLabel,
}: {
  text: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 1200);
    } catch {
      // no-op
    }
  };

  return (
    <button
      type="button"
      className={className ?? s.copyButton}
      aria-label={ariaLabel ?? `Copy ${text}`}
      onClick={() => {
        void handleCopy();
      }}
    >
      <span className={s.iconStack}>
        <span className={s.iconLayer} style={{ opacity: copied ? 0 : 1 }}>
          <Copy size={12} aria-hidden="true" />
        </span>
        <span className={s.iconLayer} style={{ opacity: copied ? 1 : 0 }}>
          <Check size={12} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
