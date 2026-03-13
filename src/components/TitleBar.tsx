import { getCurrentWindow } from "@tauri-apps/api/window";
import React from "react";
import * as s from "./TitleBar.css";

const appWindow = getCurrentWindow();

// ─── Icons ────────────────────────────────────────────────────────────────────

function MinimizeIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true">
      <path d="M0 0.5 H10" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M0 0 L10 10 M10 0 L0 10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Slot for global app action buttons (e.g., theme-switch, language-switch). */
export function Toolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div role="toolbar" aria-label="Application actions" className={s.toolbar}>
      {children}
    </div>
  );
}

// ─── TitleBar ─────────────────────────────────────────────────────────────────

export function TitleBar({ tools }: { tools?: React.ReactElement[] }) {
  return (
    <header className={s.header}>
      <div data-tauri-drag-region className={s.dragRegion}></div>

      <Toolbar>
        {tools?.map((tool) => (
          <React.Fragment key={tool.key}>{tool}</React.Fragment>
        ))}
      </Toolbar>

      <div aria-hidden="true" className={s.divider} />

      <div
        role="toolbar"
        aria-label="Window controls"
        className={s.windowControls}
      >
        <button
          type="button"
          aria-label="Minimize"
          className={s.trafficButton({ variant: "default" })}
          onClick={() => void appWindow.minimize()}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          aria-label="Maximize / Restore"
          className={s.trafficButton({ variant: "default" })}
          onClick={() => void appWindow.toggleMaximize()}
        >
          <MaximizeIcon />
        </button>
        <button
          type="button"
          aria-label="Close"
          className={s.trafficButton({ variant: "close" })}
          onClick={() => void appWindow.close()}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
