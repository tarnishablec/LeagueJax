import { z } from "zod";
import type { SettingDefinition } from "@/features/settings/types";

export type Language = "zh-CN" | "en" | "ja-JP";

export const SYSTEM_LANGUAGE_SETTING_ID = "system.preferences.language";

export const DEFAULT_LANGUAGE: Language = "zh-CN";

export const LANGUAGE_SETTING_DEFINITION = {
  id: SYSTEM_LANGUAGE_SETTING_ID,
  labelKey: "settings.language.label",
  hintKey: "settings.language.hint",
  scope: "frontend",
  control: { kind: "select" },
  zod: z.enum(["zh-CN", "en", "ja-JP"]),
  defaultValue: DEFAULT_LANGUAGE,
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
} satisfies SettingDefinition;

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

export function detectSystemLanguage(): Language {
  const primaryLocale =
    globalThis.navigator?.languages?.find((locale) => locale.trim() !== "") ??
    globalThis.navigator?.language;

  return languageFromSystemLocale(primaryLocale);
}
