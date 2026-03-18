import * as s from "./SettingsInput.css";

interface SettingsInputProps {
  ariaLabel: string;
  type: "text" | "number";
  value: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onValueChange: (value: string) => void;
}

export function SettingsInput({
  ariaLabel,
  type,
  value,
  min,
  max,
  step,
  placeholder,
  onValueChange,
}: SettingsInputProps) {
  return (
    <input
      aria-label={ariaLabel}
      className={s.input}
      type={type}
      value={value}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}
