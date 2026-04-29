import { z } from "zod";
import type { SettingsShardApi } from "@/features/settings/types";
import { setting, settings } from "./index";

export type Language = "zh-CN" | "en" | "ja-JP";
export type Theme = "system" | "light" | "dark";

export const SYSTEM_LANGUAGE_SETTING_ID = "system.preferences.language";
export const SYSTEM_THEME_SETTING_ID = "system.preferences.theme";
const SYSTEM_PREFERENCES_SECTION = "system.preferences" as const;
const SYSTEM_NETWORK_SECTION = "system.network" as const;

@settings
class GeneralSettings {
  @setting({
    id: SYSTEM_LANGUAGE_SETTING_ID,
    labelKey: "settings.language.label",
    hintKey: "settings.language.hint",
    scope: "frontend",
    control: { kind: "select" },
    zod: z.enum(["zh-CN", "en", "ja-JP"]),
    defaultValue: "zh-CN",
    options: [
      {
        value: "zh-CN",
        labelKey: "settings.language.zhCN",
        displayLabel: "简体中文",
      },
      {
        value: "en",
        labelKey: "settings.language.en",
        displayLabel: "English",
      },
      {
        value: "ja-JP",
        labelKey: "settings.language.jaJP",
        displayLabel: "日本語",
      },
    ],
    order: 10,
    onSet: () => {},
  })
  public language: Language = "zh-CN";
}

export function registerGeneralSettings(api: SettingsShardApi): void {
  api.registerPage({ id: "system", order: 10 });
  api.registerSection({ key: SYSTEM_PREFERENCES_SECTION, order: 10 });
  api.registerSection({ key: SYSTEM_NETWORK_SECTION, order: 20 });

  api.registerClass(GeneralSettings);

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
