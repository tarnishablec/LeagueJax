import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Pin } from "lucide-react";
import { type MouseEvent, useSyncExternalStore } from "react";
import { trafficButton } from "@/components/WindowControlButton.css.ts";
import { CloseIcon, MinimizeIcon } from "@/components/WindowControlIcons.tsx";
import { useSettings } from "@/features/settings/context";
import { MINI_PIN_SETTING_ID } from "../settings";
import * as s from "./MiniTitleBar.css.ts";

function useMiniPinValue(): boolean {
  const settings = useSettings();
  const value = useSyncExternalStore(
    (onStoreChange) => settings.subscribe(MINI_PIN_SETTING_ID, onStoreChange),
    () => settings.get<boolean>(MINI_PIN_SETTING_ID),
    () => settings.get<boolean>(MINI_PIN_SETTING_ID),
  );

  return value ?? true;
}

export function MiniTitleBar() {
  const settings = useSettings();
  const isPinned = useMiniPinValue();
  const handleDragStart = async (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    if (isPinned) {
      await invoke("set_mini_pin", { enabled: false });
    }

    await getCurrentWindow().startDragging();
  };

  return (
    <header className={s.header}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: this title bar text is used as a native window drag handle, and on mouse down we may unpin the mini window before starting the Tauri drag operation */}
      <div className={s.dragZone} onMouseDown={handleDragStart}>
        Mini
      </div>

      <div role="toolbar" aria-label="Window controls" className={s.controls}>
        <button
          type="button"
          aria-label="Toggle pin mini window"
          aria-pressed={isPinned}
          className={[trafficButton({ variant: "default" }), s.windowButton]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            settings.set(MINI_PIN_SETTING_ID, !isPinned);
          }}
        >
          <Pin size={14} aria-hidden="true" />
        </button>
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
          onClick={() => void getCurrentWindow().close()}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
