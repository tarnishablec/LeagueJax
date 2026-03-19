import { useEffect, useSyncExternalStore } from "react";
import { settingsApi } from "@/features/settings/store";
import {
  SYSTEM_THEME_SETTING_ID,
  type Theme,
} from "@/features/settings/store/general";

export function useTheme() {
  const theme =
    useSyncExternalStore(
      (onStoreChange) =>
        settingsApi.subscribe(SYSTEM_THEME_SETTING_ID, onStoreChange),
      () => settingsApi.get<Theme>(SYSTEM_THEME_SETTING_ID),
      () => settingsApi.get<Theme>(SYSTEM_THEME_SETTING_ID),
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
