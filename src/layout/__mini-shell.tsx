/** @jsxImportSource solid-js */
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { JSX } from "solid-js";
import { onCleanup, onMount } from "solid-js";
import { MiniTitleBar } from "@/features/mini/components/MiniTitleBar";
import { useSolidWindowEffectBackgroundFallback } from "@/features/window-effect/use-window-effect";
import { useSolidLcuEvents } from "@/hooks/use-lcu-events";
import { useSolidTheme } from "@/hooks/use-theme";
import * as mini from "./__mini.css.ts";

const MINI_HOVER_SUSPENDED_ATTRIBUTE = "data-mini-hover-suspended";

function useMiniWindowHoverSuspension() {
  onMount(() => {
    const root = document.documentElement;
    const suspendHover = () =>
      root.setAttribute(MINI_HOVER_SUSPENDED_ATTRIBUTE, "true");
    const resumeHover = () =>
      root.removeAttribute(MINI_HOVER_SUSPENDED_ATTRIBUTE);

    let removePointerListeners = () => {};

    const attachPointerListeners = () => {
      removePointerListeners();

      const resumeOnPointerInteraction = () => {
        resumeHover();
        removePointerListeners();
      };

      window.addEventListener("pointermove", resumeOnPointerInteraction, {
        passive: true,
      });
      window.addEventListener("pointerdown", resumeOnPointerInteraction, {
        passive: true,
      });

      removePointerListeners = () => {
        window.removeEventListener("pointermove", resumeOnPointerInteraction);
        window.removeEventListener("pointerdown", resumeOnPointerInteraction);
        removePointerListeners = () => {};
      };
    };

    suspendHover();
    attachPointerListeners();

    let disposed = false;
    let unlistenFocusChange: (() => void) | null = null;

    void getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (!focused) {
          return;
        }

        suspendHover();
        attachPointerListeners();
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten();
          return;
        }

        unlistenFocusChange = unlisten;
      });

    onCleanup(() => {
      disposed = true;
      removePointerListeners();
      resumeHover();
      unlistenFocusChange?.();
    });
  });
}

export function MiniWindowShell(props: { children: JSX.Element }) {
  useSolidWindowEffectBackgroundFallback();
  useSolidLcuEvents();
  useSolidTheme();
  useMiniWindowHoverSuspension();

  return (
    <div class={mini.shell}>
      <MiniTitleBar />
      <main class={mini.content}>{props.children}</main>
    </div>
  );
}
