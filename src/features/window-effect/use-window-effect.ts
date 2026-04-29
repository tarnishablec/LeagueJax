import { useEffect, useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context";
import {
  normalizeWindowEffectBaseColor,
  WINDOW_EFFECT_BASE_COLOR_SETTING_ID,
  WINDOW_EFFECT_NONE,
  WINDOW_EFFECT_SETTING_ID,
} from "./color";

const WINDOW_EFFECT_NONE_CLASS = "window-effect-none";
const WINDOW_EFFECT_BASE_COLOR_PROPERTY = "--window-effect-base-color";

export function useWindowEffectBackgroundFallback() {
  const settings = useSettings();
  const windowEffect =
    useSyncExternalStore(
      (onStoreChange) =>
        settings.subscribe(WINDOW_EFFECT_SETTING_ID, onStoreChange),
      () => settings.get<string>(WINDOW_EFFECT_SETTING_ID),
      () => settings.get<string>(WINDOW_EFFECT_SETTING_ID),
    ) ?? "";
  const windowEffectBaseColor = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(WINDOW_EFFECT_BASE_COLOR_SETTING_ID, onStoreChange),
    () => settings.get<string>(WINDOW_EFFECT_BASE_COLOR_SETTING_ID),
    () => settings.get<string>(WINDOW_EFFECT_BASE_COLOR_SETTING_ID),
  );

  useEffect(() => {
    const root = document.documentElement;
    const shouldUseSolidBackground = windowEffect === WINDOW_EFFECT_NONE;
    const baseColor = shouldUseSolidBackground
      ? "transparent"
      : normalizeWindowEffectBaseColor(windowEffectBaseColor);

    root.classList.toggle(WINDOW_EFFECT_NONE_CLASS, shouldUseSolidBackground);
    root.style.setProperty(WINDOW_EFFECT_BASE_COLOR_PROPERTY, baseColor);

    return () => {
      root.classList.remove(WINDOW_EFFECT_NONE_CLASS);
      root.style.removeProperty(WINDOW_EFFECT_BASE_COLOR_PROPERTY);
    };
  }, [windowEffect, windowEffectBaseColor]);
}
