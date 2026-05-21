/** @jsxImportSource solid-js */
import { Loader, RefreshCw } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import * as s from "./RefreshButton.css.ts";

export function RefreshButton(props: {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
  size?: number;
  className?: string;
  minLoadingMs?: number;
}): JSX.Element {
  const [isLoadingVisible, setIsLoadingVisible] = createSignal(
    Boolean(props.loading),
  );
  let loadingStartedAt: number | null = props.loading ? Date.now() : null;
  let timeoutId: number | null = null;

  const clearTimer = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  createEffect(() => {
    clearTimer();

    if (props.loading) {
      loadingStartedAt = Date.now();
      setIsLoadingVisible(true);
      return;
    }

    const minLoadingMs = props.minLoadingMs ?? 0;
    const elapsed = loadingStartedAt
      ? Date.now() - loadingStartedAt
      : minLoadingMs;
    const remainingMs = Math.max(0, minLoadingMs - elapsed);

    if (remainingMs <= 0) {
      loadingStartedAt = null;
      setIsLoadingVisible(false);
      return;
    }

    timeoutId = window.setTimeout(() => {
      loadingStartedAt = null;
      setIsLoadingVisible(false);
      timeoutId = null;
    }, remainingMs);
  });

  onCleanup(clearTimer);

  const size = () => props.size ?? 14;
  const className = () =>
    props.className ? `${s.root} ${props.className}` : s.root;

  return (
    <button
      type="button"
      class={className()}
      aria-label={props.ariaLabel}
      disabled={props.disabled || isLoadingVisible()}
      onClick={props.onClick}
    >
      {isLoadingVisible() ? (
        <Loader size={size()} class={s.iconSpin} />
      ) : (
        <RefreshCw size={size()} />
      )}
    </button>
  );
}
