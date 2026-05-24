/** @jsxImportSource solid-js */
import { Check, Copy } from "lucide-solid";
import type { JSX } from "solid-js";
import { createSignal, onCleanup, splitProps } from "solid-js";
import * as s from "./CopyButton.css.ts";

type CopyButtonProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  text: string;
  className?: string;
};

export function CopyButton(props: CopyButtonProps): JSX.Element {
  const [local, buttonProps] = splitProps(props, [
    "text",
    "class",
    "className",
    "aria-label",
    "onClick",
  ]);
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

  const buttonClass = () => local.class ?? local.className ?? s.copyButton;
  const label = () => local["aria-label"] ?? `Copy ${local.text}`;

  return (
    <button
      {...buttonProps}
      type="button"
      class={buttonClass()}
      aria-label={label()}
      onClick={(event) => {
        if (typeof local.onClick === "function") {
          local.onClick(event);
        }
        if (!event.defaultPrevented) {
          void handleCopy();
        }
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
