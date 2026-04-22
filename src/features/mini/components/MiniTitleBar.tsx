import { getCurrentWindow } from "@tauri-apps/api/window";
import { Pin } from "lucide-react";
import { useSyncExternalStore } from "react";
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

  return (
    <header className={s.header}>
      <div data-tauri-drag-region className={s.dragZone}>
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
          onClick={() => void getCurrentWindow().hide()}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
