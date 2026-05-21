/** @jsxImportSource solid-js */
import { type LucideIcon, Moon, Sparkle, Sun } from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useSolidSettings } from "@/features/settings/solid-context";
import {
  SYSTEM_THEME_SETTING_ID,
  type Theme,
} from "@/features/settings/store/general";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import * as s from "./ThemeToggle.css.ts";

const THEME_OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Sparkle },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle(): JSX.Element {
  const settings = useSolidSettings();
  const theme = useSolidSettingValue<Theme>(SYSTEM_THEME_SETTING_ID, "system");
  const current = createMemo(
    () =>
      THEME_OPTIONS.find((option) => option.value === theme()) ??
      THEME_OPTIONS[1],
  );

  return (
    <div class={s.wrapper}>
      <button
        type="button"
        aria-label={`Theme: ${current().label}`}
        class={s.trigger}
      >
        <Dynamic component={current().Icon} size={14} aria-hidden="true" />
      </button>

      <div class={s.dropdownOuter}>
        <div class={s.dropdownInner}>
          <For each={THEME_OPTIONS}>
            {({ value, label, Icon }) => (
              <button
                type="button"
                aria-label={label}
                aria-pressed={theme() === value}
                class={s.dropdownItem({
                  active: theme() === value,
                })}
                onClick={() => {
                  settings.set(SYSTEM_THEME_SETTING_ID, value);
                }}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
