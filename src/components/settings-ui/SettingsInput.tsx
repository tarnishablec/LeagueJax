import { NumberInput } from "@ark-ui/react/number-input";
import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";
import * as s from "./SettingsInput.css";

interface SettingsInputProps extends SettingsControlLayoutProps {
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
  className,
  fit,
  height,
  type,
  size,
  value,
  width,
  min,
  max,
  step,
  placeholder,
  onValueChange,
}: SettingsInputProps) {
  const rootClassName = settingsControlClassName({ className, fit, size });
  const rootStyle = settingsControlStyle({ fit, height, size, width });

  if (type === "number") {
    return (
      <NumberInput.Root
        className={`${rootClassName} ${s.numberRoot}`}
        style={rootStyle}
        value={value}
        min={min}
        max={max}
        step={step}
        inputMode="numeric"
        onValueChange={(details) => onValueChange(details.value)}
      >
        <NumberInput.Input
          aria-label={ariaLabel}
          className={s.numberInput}
          placeholder={placeholder}
        />
        <NumberInput.Control className={s.numberControl}>
          <NumberInput.DecrementTrigger
            className={`${s.numberTrigger} ${s.numberTriggerDecrement}`}
            aria-label={`${ariaLabel} decrease`}
          >
            -
          </NumberInput.DecrementTrigger>
          <NumberInput.IncrementTrigger
            className={`${s.numberTrigger} ${s.numberTriggerIncrement}`}
            aria-label={`${ariaLabel} increase`}
          >
            +
          </NumberInput.IncrementTrigger>
        </NumberInput.Control>
      </NumberInput.Root>
    );
  }

  return (
    <input
      aria-label={ariaLabel}
      className={`${rootClassName} ${s.input}`}
      style={rootStyle}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}
