import { getCurrentWindow } from "@tauri-apps/api/window";
import type React from "react";
import * as s from "./TitleBar.css";
import { trafficButton } from "./WindowControlButton.css";
import { CloseIcon, MaximizeIcon, MinimizeIcon } from "./WindowControlIcons";

const appWindow = getCurrentWindow();

export function Toolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div role="toolbar" aria-label="Application actions" className={s.toolbar}>
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
          onClick={() => void appWindow.minimize()}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          aria-label="Maximize / Restore"
          className={trafficButton({ variant: "default" })}
          onClick={() => void appWindow.toggleMaximize()}
        >
          <MaximizeIcon />
        </button>
        <button
          type="button"
          aria-label="Close"
          className={trafficButton({ variant: "close" })}
          onClick={() => void appWindow.close()}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
