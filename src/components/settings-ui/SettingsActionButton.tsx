/** @jsxImportSource solid-js */
import { Check, Loader } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import * as s from "./SettingsActionButton.css.ts";
import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";

const defaultSuccessFeedbackDurationMs = 1000;

interface SettingsActionButtonProps extends SettingsControlLayoutProps {
  ariaLabel: string;
  label: string;
  onClick: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  minLoadingMs?: number;
  successFeedback?: boolean;
  onError?: (error: unknown) => void;
  tone?: "accent" | "neutral" | "quiet";
}

export function SettingsActionButton(
  props: SettingsActionButtonProps,
): JSX.Element {
  const [pending, setPending] = createSignal(false);
  const [showSuccess, setShowSuccess] = createSignal(false);
  const [displayLabel, setDisplayLabel] = createSignal(props.label);
  const [labelVisible, setLabelVisible] = createSignal(true);
  let successTimer: number | null = null;
  let swapTimer: number | null = null;
  const busy = () => pending() || (props.loading ?? false);

  onCleanup(() => {
    if (successTimer !== null) {
      window.clearTimeout(successTimer);
    }
    if (swapTimer !== null) {
      window.clearTimeout(swapTimer);
    }
  });

  createEffect(() => {
    if (props.label === displayLabel()) {
      setLabelVisible(true);
      return;
    }

    setLabelVisible(false);
    if (swapTimer !== null) {
      window.clearTimeout(swapTimer);
    }
    swapTimer = window.setTimeout(() => {
      setDisplayLabel(props.label);
      setLabelVisible(true);
      swapTimer = null;
    }, s.labelFadeDurationMs);
  });

  const handleClick = async () => {
    if (busy() || (props.disabled ?? false)) {
      return;
    }

    if (successTimer !== null) {
      window.clearTimeout(successTimer);
      successTimer = null;
    }
    setShowSuccess(false);

    const startedAt = performance.now();
    setPending(true);
    let completedSuccessfully = false;

    try {
      await props.onClick();
      completedSuccessfully = true;
    } catch (error) {
      props.onError?.(error);
    } finally {
      const elapsedMs = performance.now() - startedAt;
      const remainingMs = Math.max(0, (props.minLoadingMs ?? 0) - elapsedMs);
      if (remainingMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, remainingMs);
        });
      }
      setPending(false);

      if (completedSuccessfully && (props.successFeedback ?? false)) {
        setShowSuccess(true);
        successTimer = window.setTimeout(() => {
          setShowSuccess(false);
          successTimer = null;
        }, defaultSuccessFeedbackDurationMs);
      }
    }
  };

  return (
    <button
      type="button"
      aria-label={props.ariaLabel}
      class={`${settingsControlClassName({
        className: props.className,
        fit: props.fit,
        size: props.size,
      })} ${s.tone[props.tone ?? "accent"]}`}
      style={
        settingsControlStyle({
          fit: props.fit,
          height: props.height,
          size: props.size,
          width: props.width,
        }) as unknown as JSX.CSSProperties
      }
      disabled={busy() || (props.disabled ?? false)}
      onClick={() => {
        void handleClick();
      }}
    >
      <span class={`${s.label} ${labelVisible() ? "" : s.labelHidden}`}>
        {displayLabel()}
      </span>
      <span class={s.loaderSlot} aria-hidden="true">
        <Loader
          size={14}
          class={`${s.feedbackIconBase} ${busy() ? s.feedbackIconVisible : ""} ${busy() ? s.iconSpin : ""}`}
        />
        <Check
          size={14}
          class={`${s.feedbackIconBase} ${showSuccess() ? s.feedbackIconVisible : ""}`}
        />
      </span>
    </button>
  );
}
