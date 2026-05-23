/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import * as s from "./FadingLabel.css";

interface FadingLabelProps {
  text: string;
  class?: string;
}

export function FadingLabel(props: FadingLabelProps): JSX.Element {
  const [displayText, setDisplayText] = createSignal(props.text);
  const [visible, setVisible] = createSignal(true);
  let swapTimer: number | null = null;

  onCleanup(() => {
    if (swapTimer !== null) {
      window.clearTimeout(swapTimer);
    }
  });

  createEffect(() => {
    if (props.text === displayText()) {
      setVisible(true);
      return;
    }

    setVisible(false);
    if (swapTimer !== null) {
      window.clearTimeout(swapTimer);
    }
    swapTimer = window.setTimeout(() => {
      setDisplayText(props.text);
      setVisible(true);
      swapTimer = null;
    }, s.fadeDurationMs);
  });

  return (
    <span
      class={`${s.label} ${props.class ?? ""} ${visible() ? "" : s.hidden}`}
    >
      {displayText()}
    </span>
  );
}
