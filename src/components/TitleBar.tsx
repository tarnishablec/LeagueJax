import { getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import type React from "react";
import * as s from "./TitleBar.css";
import { trafficButton } from "./WindowControlButton.css";
import { CloseIcon, MaximizeIcon, MinimizeIcon } from "./WindowControlIcons";

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
          <MinimizeIcon />
        </button>
        <button
          type="button"
          aria-label="Maximize / Restore"
          className={trafficButton({ variant: "default" })}
          onClick={() => void getCurrentWindow().toggleMaximize()}
        >
          <MaximizeIcon />
        </button>
        <button
          type="button"
          aria-label="Close"
          className={trafficButton({ variant: "close" })}
          onClick={() => void exit()}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
