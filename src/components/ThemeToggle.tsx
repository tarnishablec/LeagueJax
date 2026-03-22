import type { LucideIcon } from "lucide-react";
import { Moon, Sparkle, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context";
import {
  SYSTEM_THEME_SETTING_ID,
  type Theme,
} from "@/features/settings/store/general";
import * as s from "./ThemeToggle.css";

const THEME_OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Sparkle },
  { value: "dark", label: "Dark", Icon: Moon },
];

function useThemeValue(): Theme {
  const settings = useSettings();
  const value = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(SYSTEM_THEME_SETTING_ID, onStoreChange),
    () => settings.get<Theme>(SYSTEM_THEME_SETTING_ID),
    () => settings.get<Theme>(SYSTEM_THEME_SETTING_ID),
  );

  return value ?? "system";
}

export function ThemeToggle() {
  const settings = useSettings();
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
                settings.set(SYSTEM_THEME_SETTING_ID, value);
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
