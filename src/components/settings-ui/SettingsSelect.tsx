import * as s from "./SettingsSelect.css";

interface SettingsSelectOption {
  value: string;
  label: string;
}

interface SettingsSelectProps {
  ariaLabel: string;
  value: string;
  options: SettingsSelectOption[];
  onValueChange: (value: string) => void;
}

export function SettingsSelect({
  ariaLabel,
  value,
  options,
  onValueChange,
}: SettingsSelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      className={s.select}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
