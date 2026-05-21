/** @jsxImportSource solid-js */
import { getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { Copy, Minus, Square, X } from "lucide-solid";
import type { JSX } from "solid-js";
import { createSignal, onCleanup, onMount } from "solid-js";
import * as s from "./TitleBar.css.ts";
import { trafficButton } from "./WindowControlButton.css.ts";

const WINDOW_CONTROL_BOX_ICON_SIZE = 13;
const WINDOW_CONTROL_LINE_ICON_SIZE = 18;

function useWindowMaximizedState() {
  const [isMaximized, setIsMaximized] = createSignal(false);

  const syncIsMaximized = async () => {
    try {
      const maximized = await getCurrentWindow().isMaximized();
      setIsMaximized(maximized);
    } catch {
      setIsMaximized(false);
    }
  };

  onMount(() => {
    let isSubscribed = true;
    const currentWindow = getCurrentWindow();

    const syncIfSubscribed = async () => {
      try {
        const maximized = await currentWindow.isMaximized();

        if (isSubscribed) {
          setIsMaximized(maximized);
        }
      } catch {
        if (isSubscribed) {
          setIsMaximized(false);
        }
      }
    };

    void syncIfSubscribed();

    let unlistenResized: (() => void) | undefined;
    void currentWindow
      .onResized(() => {
        void syncIfSubscribed();
      })
      .then((unlisten) => {
        if (isSubscribed) {
          unlistenResized = unlisten;
          return;
        }

        unlisten();
      })
      .catch(() => undefined);

    onCleanup(() => {
      isSubscribed = false;
      unlistenResized?.();
    });
  });

  return { isMaximized, syncIsMaximized };
}

export function Toolbar(props: { children?: JSX.Element }): JSX.Element {
  return (
    <div
      data-tauri-drag-region
      role="toolbar"
      aria-label="Application actions"
      class={s.toolbar}
    >
      {props.children}
    </div>
  );
}

interface TitleBarProps {
  toolbarSlots?: JSX.Element;
  titlebarSlots?: JSX.Element;
}

export function TitleBar(props: TitleBarProps): JSX.Element {
  const { isMaximized, syncIsMaximized } = useWindowMaximizedState();

  const handleToggleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } finally {
      await syncIsMaximized();
    }
  };

  return (
    <header data-tauri-drag-region class={s.header}>
      <div data-tauri-drag-region class={s.centerSlots}>
        {props.titlebarSlots}
      </div>

      <Toolbar>{props.toolbarSlots}</Toolbar>

      <div aria-hidden="true" class={s.divider} />

      <div role="toolbar" aria-label="Window controls" class={s.windowControls}>
        <button
          type="button"
          aria-label="Minimize"
          class={trafficButton({ variant: "default" })}
          onClick={() => void getCurrentWindow().minimize()}
        >
          <Minus size={WINDOW_CONTROL_LINE_ICON_SIZE} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={isMaximized() ? "Restore" : "Maximize"}
          class={trafficButton({ variant: "default" })}
          onClick={() => {
            void handleToggleMaximize().catch(() => undefined);
          }}
        >
          {isMaximized() ? (
            <Copy
              size={WINDOW_CONTROL_BOX_ICON_SIZE}
              aria-hidden="true"
              class={s.restoreIcon}
            />
          ) : (
            <Square size={WINDOW_CONTROL_BOX_ICON_SIZE} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label="Close"
          class={trafficButton({ variant: "close" })}
          onClick={() => void exit()}
        >
          <X size={WINDOW_CONTROL_LINE_ICON_SIZE} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
