import * as s from "./SettingsSwitch.css";

interface SettingsSwitchProps {
  ariaLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingsToggle({
  ariaLabel,
  checked,
  onCheckedChange,
}: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      className={s.button({ checked })}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className={s.text}>{checked ? "On" : "Off"}</span>
      <span className={s.track({ checked })}>
        <span className={s.thumb} />
      </span>
    </button>
  );
}
