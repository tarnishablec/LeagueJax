import type { LucideIcon } from "lucide-react";
import { Moon, Sparkle, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { settingsApi } from "@/features/settings/store";
import {
  GENERAL_THEME_SETTING_ID,
  type Theme,
} from "@/features/settings/store/general";
import * as s from "./ThemeToggle.css";

const THEME_OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Sparkle },
  { value: "dark", label: "Dark", Icon: Moon },
];

function useThemeValue(): Theme {
  const value = useSyncExternalStore(
    (onStoreChange) =>
      settingsApi.subscribe(GENERAL_THEME_SETTING_ID, onStoreChange),
    () => settingsApi.get<Theme>(GENERAL_THEME_SETTING_ID),
    () => settingsApi.get<Theme>(GENERAL_THEME_SETTING_ID),
  );

  return value ?? "system";
}

export function ThemeToggle() {
  const theme = useThemeValue();
  const current =
    THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[1];
  const CurrentIcon = current.Icon;

  return (
    <div className={s.wrapper}>
      <button
        type="button"
        aria-label={`Theme: ${current.label}`}
        className={s.trigger}
      >
        <CurrentIcon size={14} aria-hidden="true" />
      </button>

      <div className={s.dropdownOuter}>
        <div className={s.dropdownInner}>
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={theme === value}
              className={s.dropdownItem({ active: theme === value })}
              onClick={() => {
                settingsApi.set(GENERAL_THEME_SETTING_ID, value);
              }}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
