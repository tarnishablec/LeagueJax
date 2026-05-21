/** @jsxImportSource solid-js */
import { invoke } from "@tauri-apps/api/core";
import { AppWindowMac } from "lucide-solid";
import type { JSX } from "solid-js";
import { trigger } from "@/components/ToolbarActionButton.css";

export function MiniWindowToggleButton(): JSX.Element {
  return (
    <button
      type="button"
      class={trigger}
      aria-label="Toggle mini window"
      onClick={() => {
        void invoke("toggle_mini_window");
      }}
    >
      <AppWindowMac size={14} aria-hidden="true" />
    </button>
  );
}
