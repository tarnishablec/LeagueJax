import type { LucideIcon } from "lucide-react";
import { Moon, Sparkle, Sun } from "lucide-react";
import { type Theme, useThemeStore } from "../stores/theme";
import * as s from "./ThemeToggle.css";

// ─── Config ───────────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Sparkle },
  { value: "dark", label: "Dark", Icon: Moon },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const current =
    THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[1];
  const CurrentIcon = current.Icon;

  return (
    <div className={s.wrapper}>
      {/* Trigger */}
      <button
        type="button"
        aria-label={`Theme: ${current.label}`}
        className={s.trigger}
      >
        <CurrentIcon size={14} aria-hidden="true" />
      </button>

      {/* Dropdown — flush with the trigger so the hover area is continuous */}
      <div className={s.dropdownOuter}>
        <div className={s.dropdownInner}>
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={theme === value}
              className={s.dropdownItem({ active: theme === value })}
              onClick={() => setTheme(value)}
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
