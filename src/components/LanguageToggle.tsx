import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { settingsApi } from "@/features/settings/store";
import {
  type Language,
  SYSTEM_LANGUAGE_SETTING_ID,
} from "@/features/settings/store/general";
import * as s from "./LanguageToggle.css";

const LANGUAGE_OPTIONS: Array<{
  value: Language;
  labelKey: string;
  short: string;
  ariaLabel: string;
}> = [
  {
    value: "zh-CN",
    labelKey: "settings.language.zhCN",
    short: "ZH",
    ariaLabel: "Simplified Chinese",
  },
  {
    value: "en",
    labelKey: "settings.language.en",
    short: "EN",
    ariaLabel: "English",
  },
];

function useLanguageValue(): Language {
  const value = useSyncExternalStore(
    (onStoreChange) =>
      settingsApi.subscribe(SYSTEM_LANGUAGE_SETTING_ID, onStoreChange),
    () => settingsApi.get<Language>(SYSTEM_LANGUAGE_SETTING_ID),
    () => settingsApi.get<Language>(SYSTEM_LANGUAGE_SETTING_ID),
  );

  return value ?? "zh-CN";
}

export function LanguageToggle() {
  const { t } = useTranslation();
  const language = useLanguageValue();
  const current =
    LANGUAGE_OPTIONS.find((option) => option.value === language) ??
    LANGUAGE_OPTIONS[0];

  return (
    <div className={s.wrapper}>
      <button
        type="button"
        aria-label={`Language: ${current.ariaLabel}`}
        className={s.trigger}
      >
        {current.short}
      </button>

      <div className={s.dropdownOuter}>
        <div className={s.dropdownInner}>
          {LANGUAGE_OPTIONS.map(({ value, labelKey, ariaLabel }) => (
            <button
              key={value}
              type="button"
              aria-label={`Switch language to ${ariaLabel}`}
              aria-pressed={language === value}
              className={s.dropdownItem({ active: language === value })}
              onClick={() => {
                settingsApi.set(SYSTEM_LANGUAGE_SETTING_ID, value);
              }}
            >
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
