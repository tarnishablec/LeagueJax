import { getCurrentWindow } from "@tauri-apps/api/window";
import { type ReactNode, useEffect } from "react";
import { MiniTitleBar } from "@/features/mini/components/MiniTitleBar.tsx";
import { useWindowEffectBackgroundFallback } from "@/features/window-effect/use-window-effect";
import { useLcuEvents } from "@/hooks/use-lcu-events";
import { useTheme } from "@/hooks/use-theme";
import * as mini from "./__mini.css.ts";

const MINI_HOVER_SUSPENDED_ATTRIBUTE = "data-mini-hover-suspended";

function useMiniWindowHoverSuspension() {
  useEffect(() => {
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

    return () => {
      disposed = true;
      removePointerListeners();
      resumeHover();
      unlistenFocusChange?.();
    };
  }, []);
}

export function MiniWindowShell({ children }: { children: ReactNode }) {
  useWindowEffectBackgroundFallback();
  useLcuEvents();
  useTheme();
  useMiniWindowHoverSuspension();

  return (
    <div className={mini.shell}>
      <MiniTitleBar />
      <main className={mini.content}>{children}</main>
    </div>
  );
}
