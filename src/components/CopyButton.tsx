/** @jsxImportSource solid-js */
import { Check, Copy } from "lucide-solid";
import type { JSX } from "solid-js";
import { createSignal, onCleanup } from "solid-js";
import * as s from "./CopyButton.css.ts";

export function CopyButton(props: {
  text: string;
  className?: string;
  "aria-label"?: string;
}): JSX.Element {
  const [copied, setCopied] = createSignal(false);
  let timer: number | null = null;

  onCleanup(() => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        setCopied(false);
        timer = null;
      }, 1200);
    } catch {
      // no-op
    }
  };

  return (
    <button
      type="button"
      class={props.className ?? s.copyButton}
      aria-label={props["aria-label"] ?? `Copy ${props.text}`}
      onClick={() => {
        void handleCopy();
      }}
    >
      <span class={s.iconStack}>
        <span class={s.iconLayer} style={{ opacity: copied() ? 0 : 1 }}>
          <Copy size={12} aria-hidden="true" />
        </span>
        <span class={s.iconLayer} style={{ opacity: copied() ? 1 : 0 }}>
          <Check size={12} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
