import { getCurrentWindow } from "@tauri-apps/api/window";
import { trafficButton } from "@/components/WindowControlButton.css.ts";
import { CloseIcon, MinimizeIcon } from "@/components/WindowControlIcons.tsx";
import * as s from "./MiniTitleBar.css.ts";

export function MiniTitleBar() {
  return (
    <header className={s.header}>
      <div data-tauri-drag-region className={s.dragZone}>
        Mini
      </div>

      <div role="toolbar" aria-label="Window controls" className={s.controls}>
        <button
          type="button"
          aria-label="Minimize"
          className={[trafficButton({ variant: "default" }), s.windowButton]
            .filter(Boolean)
            .join(" ")}
          onClick={() => void getCurrentWindow().minimize()}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          aria-label="Close"
          className={[trafficButton({ variant: "close" }), s.windowButton]
            .filter(Boolean)
            .join(" ")}
          onClick={() => void getCurrentWindow().hide()}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
