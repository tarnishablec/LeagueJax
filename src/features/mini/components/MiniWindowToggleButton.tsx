import { invoke } from "@tauri-apps/api/core";
import { AppWindowMac } from "lucide-react";
import { trigger } from "@/components/ToolbarActionButton.css";

export function MiniWindowToggleButton() {
  return (
    <button
      type="button"
      className={trigger}
      aria-label="Toggle mini window"
      onClick={() => {
        void invoke("toggle_mini_window");
      }}
    >
      <AppWindowMac size={14} aria-hidden="true" />
    </button>
  );
}
