import { createEffect, onCleanup } from "solid-js";
import {
  SYSTEM_THEME_SETTING_ID,
  type Theme,
} from "@/features/settings/store/general";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";

export function useSolidTheme(): void {
  const theme = useSolidSettingValue<Theme>(SYSTEM_THEME_SETTING_ID, "system");

  createEffect(() => {
    const root = document.documentElement;
    const currentTheme = theme() ?? "system";

    function apply(dark: boolean) {
      root.classList.toggle("dark", dark);
    }

    if (currentTheme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener("change", handler);
      onCleanup(() => mq.removeEventListener("change", handler));
      return;
    }

    apply(currentTheme === "dark");
  });
}
