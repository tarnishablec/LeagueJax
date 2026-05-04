import { getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { Copy, Minus, Square, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import * as s from "./TitleBar.css";
import { trafficButton } from "./WindowControlButton.css";

const WINDOW_CONTROL_BOX_ICON_SIZE = 13;
const WINDOW_CONTROL_LINE_ICON_SIZE = 18;

function useWindowMaximizedState() {
  const [isMaximized, setIsMaximized] = useState(false);

  const syncIsMaximized = useCallback(async () => {
    try {
      const maximized = await getCurrentWindow().isMaximized();
      setIsMaximized(maximized);
    } catch {
      setIsMaximized(false);
    }
  }, []);

  useEffect(() => {
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

    return () => {
      isSubscribed = false;
      unlistenResized?.();
    };
  }, []);

  return { isMaximized, syncIsMaximized };
}

export function Toolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div
      data-tauri-drag-region
      role="toolbar"
      aria-label="Application actions"
      className={s.toolbar}
    >
      {children}
    </div>
  );
}

interface TitleBarProps {
  toolbarSlots?: React.ReactElement[];
  titlebarSlots?: React.ReactElement[];
}

export function TitleBar({
  toolbarSlots = [],
  titlebarSlots = [],
}: TitleBarProps) {
  const { isMaximized, syncIsMaximized } = useWindowMaximizedState();

  const handleToggleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } finally {
      await syncIsMaximized();
    }
  };

  return (
    <header data-tauri-drag-region className={s.header}>
      <div data-tauri-drag-region className={s.centerSlots}>
        {titlebarSlots}
      </div>

      <Toolbar>{toolbarSlots}</Toolbar>

      <div aria-hidden="true" className={s.divider} />

      <div
        role="toolbar"
        aria-label="Window controls"
        className={s.windowControls}
      >
        <button
          type="button"
          aria-label="Minimize"
          className={trafficButton({ variant: "default" })}
          onClick={() => void getCurrentWindow().minimize()}
        >
          <Minus size={WINDOW_CONTROL_LINE_ICON_SIZE} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? "Restore" : "Maximize"}
          className={trafficButton({ variant: "default" })}
          onClick={() => {
            void handleToggleMaximize().catch(() => undefined);
          }}
        >
          {isMaximized ? (
            <Copy
              size={WINDOW_CONTROL_BOX_ICON_SIZE}
              aria-hidden="true"
              className={s.restoreIcon}
            />
          ) : (
            <Square size={WINDOW_CONTROL_BOX_ICON_SIZE} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label="Close"
          className={trafficButton({ variant: "close" })}
          onClick={() => void exit()}
        >
          <X size={WINDOW_CONTROL_LINE_ICON_SIZE} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
