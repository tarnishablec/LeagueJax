import { useLayoutEffect, useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context";
import {
  SYSTEM_THEME_SETTING_ID,
  type Theme,
} from "@/features/settings/store/general";

export function useTheme() {
  const settings = useSettings();
  const theme =
    useSyncExternalStore(
      (onStoreChange) =>
        settings.subscribe(SYSTEM_THEME_SETTING_ID, onStoreChange),
      () => settings.get<Theme>(SYSTEM_THEME_SETTING_ID),
      () => settings.get<Theme>(SYSTEM_THEME_SETTING_ID),
    ) ?? "system";

  useLayoutEffect(() => {
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
