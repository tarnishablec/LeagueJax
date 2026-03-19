import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { RegisteredSetting } from "@/features/settings/types";
import * as s from "./SettingsRegistryList.css";

interface SettingsRegistryListProps {
  definitions: RegisteredSetting[];
}

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
  const { t } = useTranslation();

  const rows = useMemo(() => {
    return [...definitions].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }, [definitions]);

  return (
    <div className={s.card}>
      <div className={s.header}>
        <span>
          {t("settings.registry.columns.key", { defaultValue: "Key" })}
        </span>
        <span>
          {t("settings.registry.columns.zh", { defaultValue: "中文" })}
        </span>
        <span>
          {t("settings.registry.columns.en", { defaultValue: "English" })}
        </span>
        <span>
          {t("settings.registry.columns.scope", { defaultValue: "Scope" })}
        </span>
      </div>

      {rows.map((setting) => (
        <div key={setting.id} className={s.row}>
          <span className={s.key}>{setting.id}</span>
          <span className={s.text}>
            {t(setting.labelKey, {
              lng: "zh-CN",
              defaultValue: setting.labelKey,
            })}
          </span>
          <span className={s.text}>
            {t(setting.labelKey, { lng: "en", defaultValue: setting.labelKey })}
          </span>
          <span className={s.scope}>{toScope(setting.scope)}</span>
        </div>
      ))}
    </div>
  );
}
