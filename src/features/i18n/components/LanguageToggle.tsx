/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { createMemo, For } from "solid-js";
import { useSolidSettings } from "@/features/settings/solid-context";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { type Language, SYSTEM_LANGUAGE_SETTING_ID } from "../locale";
import * as s from "./LanguageToggle.css.ts";

const LANGUAGE_OPTIONS: {
  value: Language;
  displayLabel: string;
  short: string;
  ariaLabel: string;
}[] = [
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

export function LanguageToggle(): JSX.Element {
  const settings = useSolidSettings();
  const language = useSolidSettingValue<Language>(
    SYSTEM_LANGUAGE_SETTING_ID,
    "zh-CN",
  );
  const current = createMemo(
    () =>
      LANGUAGE_OPTIONS.find((option) => option.value === language()) ??
      LANGUAGE_OPTIONS[0],
  );

  return (
    <div class={s.wrapper}>
      <button
        type="button"
        aria-label={`Language: ${current().ariaLabel}`}
        class={s.trigger}
      >
        {current().short}
      </button>

      <div class={s.dropdownOuter}>
        <div class={s.dropdownInner}>
          <For each={LANGUAGE_OPTIONS}>
            {({ value, displayLabel, ariaLabel }) => (
              <button
                type="button"
                aria-label={`Switch language to ${ariaLabel}`}
                aria-pressed={language() === value}
                class={s.dropdownItem({
                  active: language() === value,
                })}
                onClick={() => {
                  settings.set(SYSTEM_LANGUAGE_SETTING_ID, value);
                }}
              >
                <span>{displayLabel}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
