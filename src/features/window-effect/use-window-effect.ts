import { useEffect, useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context";
import { THEME_BACKDROP_OVERRIDE_PROPERTY } from "@/styles/theme.css";
import {
  normalizeWindowEffectBaseColor,
  WINDOW_EFFECT_BASE_COLOR_SETTING_ID,
  WINDOW_EFFECT_SETTING_ID,
} from "./color";

const WINDOW_EFFECT_BASE_COLOR_PROPERTY = "--window-effect-base-color";
const WINDOW_EFFECT_ATTRIBUTE = "data-window-effect";

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
    const baseColor = normalizeWindowEffectBaseColor(windowEffectBaseColor);

    root.setAttribute(WINDOW_EFFECT_ATTRIBUTE, windowEffect);
    root.style.setProperty(THEME_BACKDROP_OVERRIDE_PROPERTY, baseColor);
    root.style.setProperty(WINDOW_EFFECT_BASE_COLOR_PROPERTY, baseColor);

    return () => {
      root.removeAttribute(WINDOW_EFFECT_ATTRIBUTE);
      root.style.removeProperty(THEME_BACKDROP_OVERRIDE_PROPERTY);
      root.style.removeProperty(WINDOW_EFFECT_BASE_COLOR_PROPERTY);
    };
  }, [windowEffect, windowEffectBaseColor]);
}
