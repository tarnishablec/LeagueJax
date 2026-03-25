import { NumberInput } from "@ark-ui/react/number-input";
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
  if (type === "number") {
    return (
      <NumberInput.Root
        className={s.numberRoot}
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
      className={s.input}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}
