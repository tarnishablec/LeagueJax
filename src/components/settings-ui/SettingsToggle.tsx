import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";
import * as s from "./SettingsSwitch.css";

interface SettingsSwitchProps extends SettingsControlLayoutProps {
  ariaLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingsToggle({
  ariaLabel,
  className,
  checked,
  fit,
  height,
  size,
  width,
  onCheckedChange,
}: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      className={`${settingsControlClassName({ className, fit, size })} ${s.button({ checked })}`}
      style={settingsControlStyle({ fit, height, size, width })}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className={s.text}>{checked ? "On" : "Off"}</span>
      <span className={s.track({ checked })}>
        <span className={s.thumb} />
      </span>
    </button>
  );
}
