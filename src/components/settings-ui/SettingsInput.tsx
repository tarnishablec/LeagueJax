/** @jsxImportSource solid-js */
import { NumberInput } from "@ark-ui/solid/number-input";
import type { JSX } from "solid-js";
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

export function SettingsInput(props: SettingsInputProps): JSX.Element {
  const rootClassName = () =>
    settingsControlClassName({
      className: props.className,
      fit: props.fit,
      size: props.size,
    });
  const rootStyle = () =>
    settingsControlStyle({
      fit: props.fit,
      height: props.height,
      size: props.size,
      width: props.width,
    }) as unknown as JSX.CSSProperties;

  if (props.type === "number") {
    return (
      <NumberInput.Root
        class={`${rootClassName()} ${s.numberRoot}`}
        style={rootStyle()}
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        inputMode="numeric"
        onValueChange={(details) => props.onValueChange(details.value)}
      >
        <NumberInput.Input
          aria-label={props.ariaLabel}
          class={s.numberInput}
          placeholder={props.placeholder}
        />
        <NumberInput.Control class={s.numberControl}>
          <NumberInput.DecrementTrigger
            class={`${s.numberTrigger} ${s.numberTriggerDecrement}`}
            aria-label={`${props.ariaLabel} decrease`}
          >
            -
          </NumberInput.DecrementTrigger>
          <NumberInput.IncrementTrigger
            class={`${s.numberTrigger} ${s.numberTriggerIncrement}`}
            aria-label={`${props.ariaLabel} increase`}
          >
            +
          </NumberInput.IncrementTrigger>
        </NumberInput.Control>
      </NumberInput.Root>
    );
  }

  return (
    <input
      aria-label={props.ariaLabel}
      class={`${rootClassName()} ${s.input}`}
      style={rootStyle()}
      type="text"
      value={props.value}
      placeholder={props.placeholder}
      onInput={(event) => props.onValueChange(event.currentTarget.value)}
    />
  );
}
