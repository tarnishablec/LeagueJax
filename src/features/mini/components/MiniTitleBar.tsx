import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowUpToLine, Pin } from "lucide-react";
import { type MouseEvent, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { AppTooltip } from "@/components/AppTooltip";
import { trafficButton } from "@/components/WindowControlButton.css.ts";
import { CloseIcon, MinimizeIcon } from "@/components/WindowControlIcons.tsx";
import { useSettings } from "@/features/settings/context";
import type { SettingId } from "@/features/settings/types";
import {
  MINI_ALWAYS_ON_TOP_SETTING_ID,
  MINI_PIN_SETTING_ID,
} from "../settings";
import * as s from "./MiniTitleBar.css.ts";

function useMiniBooleanSetting(id: SettingId, fallback: boolean): boolean {
  const settings = useSettings();
  const value = useSyncExternalStore(
    (onStoreChange) => settings.subscribe(id, onStoreChange),
    () => settings.get<boolean>(id),
    () => settings.get<boolean>(id),
  );

  return value ?? fallback;
}

export function MiniTitleBar() {
  const settings = useSettings();
  const { t } = useTranslation();
  const isPinned = useMiniBooleanSetting(MINI_PIN_SETTING_ID, true);
  const isAlwaysOnTop = useMiniBooleanSetting(
    MINI_ALWAYS_ON_TOP_SETTING_ID,
    true,
  );
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
        <AppTooltip content={t("mini.controls.pinTooltip")} placement="bottom">
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
        </AppTooltip>
        <AppTooltip
          content={t("mini.controls.alwaysOnTopTooltip")}
          placement="bottom"
        >
          <button
            type="button"
            aria-label="Toggle always on top mini window"
            aria-pressed={isAlwaysOnTop}
            className={[trafficButton({ variant: "default" }), s.windowButton]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              settings.set(MINI_ALWAYS_ON_TOP_SETTING_ID, !isAlwaysOnTop);
            }}
          >
            <ArrowUpToLine size={14} aria-hidden="true" />
          </button>
        </AppTooltip>
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
