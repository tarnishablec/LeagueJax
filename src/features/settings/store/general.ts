import i18n from "i18next";
import { z } from "zod";
import type { SettingsShardApi } from "@/features/settings/types";
import { setting, settings } from "./index";

export type Language = "zh-CN" | "en";
export type Theme = "system" | "light" | "dark";

export const GENERAL_LANGUAGE_SETTING_ID = "general.preferences.language";
export const GENERAL_THEME_SETTING_ID = "general.preferences.theme";

@settings
export class GeneralSettings {
  @setting({
    id: GENERAL_LANGUAGE_SETTING_ID,
    labelKey: "settings.language.label",
    control: { kind: "select" },
    zod: z.enum(["zh-CN", "en"]),
    defaultValue: "zh-CN",
    options: [
      { value: "zh-CN", labelKey: "settings.language.zhCN" },
      { value: "en", labelKey: "settings.language.en" },
    ],
    order: 10,
  })
  public language: Language = "zh-CN";

  public onLanguageSet(next: unknown, _prev?: unknown): void {
    if (typeof next === "string") {
      void i18n.changeLanguage(next);
    }
  }
}

export function registerGeneralSettings(api: SettingsShardApi): void {
  api.registerSetting({
    id: GENERAL_THEME_SETTING_ID,
    labelKey: "settings.theme.label",
    control: { kind: "select" },
    zod: z.enum(["system", "light", "dark"]),
    defaultValue: "system",
    options: [
      { value: "system", labelKey: "settings.theme.system" },
      { value: "light", labelKey: "settings.theme.light" },
      { value: "dark", labelKey: "settings.theme.dark" },
    ],
    order: 20,
  });
}
