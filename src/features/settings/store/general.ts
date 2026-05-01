import { z } from "zod";
import type { SettingsShardApi } from "@/features/settings/types";

export type Theme = "system" | "light" | "dark";

export const SYSTEM_THEME_SETTING_ID = "system.preferences.theme";
const SYSTEM_PREFERENCES_SECTION = "system.preferences" as const;
const SYSTEM_NETWORK_SECTION = "system.network" as const;

export function registerGeneralSettings(api: SettingsShardApi): void {
  api.registerPage({ id: "system", order: 10 });
  api.registerSection({ key: SYSTEM_PREFERENCES_SECTION, order: 10 });
  api.registerSection({ key: SYSTEM_NETWORK_SECTION, order: 20 });

  api.registerSetting({
    id: SYSTEM_THEME_SETTING_ID,
    labelKey: "settings.theme.label",
    scope: "frontend",
    control: { kind: "select" },
    zod: z.enum(["system", "light", "dark"]),
    defaultValue: "system",
    options: [
      { value: "system", labelKey: "settings.theme.system" },
      { value: "light", labelKey: "settings.theme.light" },
      { value: "dark", labelKey: "settings.theme.dark" },
    ],
    order: 20,
    onSet: () => {},
  });
}
