import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CopyButton } from "@/components/CopyButton";
import type { RegisteredSetting } from "@/features/settings/types";
import * as s from "./SettingsRegistryList.css";

interface SettingsRegistryListProps {
  definitions: RegisteredSetting[];
}

type RegistryLocale = "zh-CN" | "en" | "ja-JP";

const localeLabel: Record<RegistryLocale, string> = {
  "zh-CN": "\u7b80\u4f53\u4e2d\u6587",
  en: "English",
  "ja-JP": "\u65e5\u672c\u8a9e",
};

const normalizeLocale = (value?: string): RegistryLocale => {
  if (!value) {
    return "en";
  }

  if (value.startsWith("zh")) {
    return "zh-CN";
  }

  if (value.startsWith("ja")) {
    return "ja-JP";
  }

  return "en";
};

const toScope = (scope?: RegisteredSetting["scope"]): string => {
  switch (scope) {
    case "backend":
      return "rs";
    case "shared":
      return "ts-rs";
    default:
      return "ts";
  }
};

export function SettingsRegistryList({
  definitions,
}: SettingsRegistryListProps) {
  const { t, i18n } = useTranslation();
  const currentLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);
  const showCurrentLanguageColumn = currentLocale !== "en";
  const currentLanguageColumnTitle = localeLabel[currentLocale];

  const rows = useMemo(() => {
    return [...definitions].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }, [definitions]);

  return (
    <div className={s.card}>
      <div
        className={`${s.header} ${
          showCurrentLanguageColumn
            ? s.headerWithCurrentLanguage
            : s.headerWithoutCurrentLanguage
        }`}
      >
        <span>
          {t("settings.registry.columns.key", { defaultValue: "Key" })}
        </span>
        {showCurrentLanguageColumn ? (
          <span>{currentLanguageColumnTitle}</span>
        ) : null}
        <span>
          {t("settings.registry.columns.en", { defaultValue: "English" })}
        </span>
        <span>
          {t("settings.registry.columns.scope", { defaultValue: "Scope" })}
        </span>
      </div>

      {rows.map((setting) => (
        <div
          key={setting.id}
          className={`${s.row} ${
            showCurrentLanguageColumn
              ? s.rowWithCurrentLanguage
              : s.rowWithoutCurrentLanguage
          }`}
        >
          <span className={s.keyCell}>
            <span className={s.key}>{setting.id}</span>
            <CopyButton text={setting.id} className={s.copyButton} />
          </span>
          {showCurrentLanguageColumn ? (
            <span className={s.text}>
              {t(setting.labelKey, {
                lng: currentLocale,
                defaultValue: setting.labelKey,
              })}
            </span>
          ) : null}
          <span className={s.text}>
            {t(setting.labelKey, { lng: "en", defaultValue: setting.labelKey })}
          </span>
          <span className={s.scope}>{toScope(setting.scope)}</span>
        </div>
      ))}
    </div>
  );
}
