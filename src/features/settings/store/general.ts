import i18n from "i18next";
import { z } from "zod";
import type { SettingsShardApi } from "@/features/settings/types";
import { setting, settings } from "./index";

export type Language = "zh-CN" | "en" | "ja-JP";
export type Theme = "system" | "light" | "dark";

export const SYSTEM_LANGUAGE_SETTING_ID = "system.preferences.language";
export const SYSTEM_THEME_SETTING_ID = "system.preferences.theme";

@settings
export class GeneralSettings {
  @setting({
    id: SYSTEM_LANGUAGE_SETTING_ID,
    labelKey: "settings.language.label",
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
    onSet: (next) => {
      if (typeof next === "string") {
        void i18n.changeLanguage(next);
      }
    },
  })
  public language: Language = "zh-CN";
}

export function registerGeneralSettings(api: SettingsShardApi): void {
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
