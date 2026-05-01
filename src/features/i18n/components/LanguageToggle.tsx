import { useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context";
import { type Language, SYSTEM_LANGUAGE_SETTING_ID } from "../locale";
import * as s from "./LanguageToggle.css";

const LANGUAGE_OPTIONS: Array<{
  value: Language;
  displayLabel: string;
  short: string;
  ariaLabel: string;
}> = [
  {
    value: "zh-CN",
    displayLabel: "简体中文",
    short: "ZH",
    ariaLabel: "Simplified Chinese",
  },
  {
    value: "en",
    displayLabel: "English",
    short: "EN",
    ariaLabel: "English",
  },
  {
    value: "ja-JP",
    displayLabel: "日本語",
    short: "JA",
    ariaLabel: "Japanese",
  },
];

function useLanguageValue(): Language {
  const settings = useSettings();
  const value = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(SYSTEM_LANGUAGE_SETTING_ID, onStoreChange),
    () => settings.get<Language>(SYSTEM_LANGUAGE_SETTING_ID),
    () => settings.get<Language>(SYSTEM_LANGUAGE_SETTING_ID),
  );

  return value ?? "zh-CN";
}

export function LanguageToggle() {
  const settings = useSettings();
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
          {LANGUAGE_OPTIONS.map(({ value, displayLabel, ariaLabel }) => (
            <button
              key={value}
              type="button"
              aria-label={`Switch language to ${ariaLabel}`}
              aria-pressed={language === value}
              className={s.dropdownItem({
                active: language === value,
              })}
              onClick={() => {
                settings.set(SYSTEM_LANGUAGE_SETTING_ID, value);
              }}
            >
              <span>{displayLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
