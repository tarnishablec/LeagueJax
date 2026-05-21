/** @jsxImportSource solid-js */
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowUpToLine, Pin } from "lucide-solid";
import { AppTooltip } from "@/components/AppTooltip";
import { trafficButton } from "@/components/WindowControlButton.css.ts";
import { CloseIcon, MinimizeIcon } from "@/components/WindowControlIcons";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import type { SettingId } from "@/features/settings/types";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import {
  MINI_ALWAYS_ON_TOP_SETTING_ID,
  MINI_PIN_SETTING_ID,
} from "../settings";
import * as s from "./MiniTitleBar.css.ts";

function useMiniBooleanSetting(id: SettingId, fallback: boolean) {
  return useSolidSettingValue<boolean>(id, fallback);
}

export function MiniTitleBar() {
  const settings = useSolidSettings();
  const { t } = useSolidTranslation();
  const isPinned = useMiniBooleanSetting(MINI_PIN_SETTING_ID, true);
  const isAlwaysOnTop = useMiniBooleanSetting(
    MINI_ALWAYS_ON_TOP_SETTING_ID,
    true,
  );
  const handleDragStart = async (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }

    if (isPinned()) {
      await invoke("set_mini_pin", { enabled: false });
    }

    await getCurrentWindow().startDragging();
  };

  const windowButtonClass = (variant: "default" | "close") =>
    [trafficButton({ variant }), s.windowButton].filter(Boolean).join(" ");

  return (
    <header class={s.header}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: this title bar text is used as a native window drag handle, and on mouse down we may unpin the mini window before starting the Tauri drag operation */}
      <div class={s.dragZone} onMouseDown={handleDragStart}>
        Mini
      </div>

      <div role="toolbar" aria-label="Window controls" class={s.controls}>
        <AppTooltip content={t("mini.controls.pinTooltip")} placement="bottom">
          {(triggerProps) => (
            <button
              {...triggerProps({
                type: "button",
                "aria-label": "Toggle pin mini window",
                "aria-pressed": isPinned(),
                class: windowButtonClass("default"),
                onClick: () => {
                  settings.set(MINI_PIN_SETTING_ID, !isPinned());
                },
              })}
            >
              <Pin size={14} aria-hidden="true" />
            </button>
          )}
        </AppTooltip>
        <AppTooltip
          content={t("mini.controls.alwaysOnTopTooltip")}
          placement="bottom"
        >
          {(triggerProps) => (
            <button
              {...triggerProps({
                type: "button",
                "aria-label": "Toggle always on top mini window",
                "aria-pressed": isAlwaysOnTop(),
                class: windowButtonClass("default"),
                onClick: () => {
                  settings.set(MINI_ALWAYS_ON_TOP_SETTING_ID, !isAlwaysOnTop());
                },
              })}
            >
              <ArrowUpToLine size={14} aria-hidden="true" />
            </button>
          )}
        </AppTooltip>
        <button
          type="button"
          aria-label="Minimize"
          class={windowButtonClass("default")}
          onClick={() => void getCurrentWindow().minimize()}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          aria-label="Close"
          class={windowButtonClass("close")}
          onClick={() => void getCurrentWindow().hide()}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
