import { z } from "zod";
import type { SettingDefinition } from "@/features/settings/types";

export type Language = "zh-CN" | "en" | "ja-JP";

export const SYSTEM_LANGUAGE_SETTING_ID = "system.preferences.language";

export const DEFAULT_LANGUAGE: Language = "en";

export function createLanguageSettingDefinition(
  defaultLanguage: Language,
): SettingDefinition {
  return {
    id: SYSTEM_LANGUAGE_SETTING_ID,
    labelKey: "settings.language.label",
    hintKey: "settings.language.hint",
    scope: "frontend",
    control: { kind: "select" },
    zod: z.enum(["zh-CN", "en", "ja-JP"]),
    defaultValue: defaultLanguage,
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
  };
}

export function languageFromSystemLocale(
  locale: string | null | undefined,
): Language {
  const normalized = locale?.trim().toLowerCase() ?? "";

  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalized.startsWith("ja")) {
    return "ja-JP";
  }

  return "en";
}
