import { useEffect, useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context";

const WINDOW_EFFECT_SETTING_ID = "system.preferences.windowEffect";
const WINDOW_EFFECT_NONE = "none";
const WINDOW_EFFECT_NONE_CLASS = "window-effect-none";

export function useWindowEffectBackgroundFallback() {
  const settings = useSettings();
  const windowEffect =
    useSyncExternalStore(
      (onStoreChange) =>
        settings.subscribe(WINDOW_EFFECT_SETTING_ID, onStoreChange),
      () => settings.get<string>(WINDOW_EFFECT_SETTING_ID),
      () => settings.get<string>(WINDOW_EFFECT_SETTING_ID),
    ) ?? "";

  useEffect(() => {
    const root = document.documentElement;
    const shouldUseSolidBackground = windowEffect === WINDOW_EFFECT_NONE;

    root.classList.toggle(WINDOW_EFFECT_NONE_CLASS, shouldUseSolidBackground);

    return () => {
      root.classList.remove(WINDOW_EFFECT_NONE_CLASS);
    };
  }, [windowEffect]);
}
