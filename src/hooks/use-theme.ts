import { useEffect, useSyncExternalStore } from "react";
import { settingsApi } from "@/features/settings/store";
import {
  GENERAL_THEME_SETTING_ID,
  type Theme,
} from "@/features/settings/store/general";

export function useTheme() {
  const theme =
    useSyncExternalStore(
      (onStoreChange) =>
        settingsApi.subscribe(GENERAL_THEME_SETTING_ID, onStoreChange),
      () => settingsApi.get<Theme>(GENERAL_THEME_SETTING_ID),
      () => settingsApi.get<Theme>(GENERAL_THEME_SETTING_ID),
    ) ?? "system";

  useEffect(() => {
    const root = document.documentElement;

    function apply(dark: boolean) {
      root.classList.toggle("dark", dark);
    }

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    apply(theme === "dark");
  }, [theme]);
}
