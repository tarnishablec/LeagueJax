/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";
import * as s from "./SettingsSwitch.css";

interface SettingsSwitchProps extends SettingsControlLayoutProps {
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingsToggle(props: SettingsSwitchProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-label={props.ariaLabel}
      aria-checked={props.checked}
      data-disabled={props.disabled ? "" : undefined}
      disabled={props.disabled ?? false}
      class={`${settingsControlClassName({
        className: props.className,
        fit: props.fit,
        size: props.size,
      })} ${s.button({ checked: props.checked })}`}
      style={
        settingsControlStyle({
          fit: props.fit,
          height: props.height,
          size: props.size,
          width: props.width,
        }) as unknown as JSX.CSSProperties
      }
      onClick={() => props.onCheckedChange(!props.checked)}
    >
      <span class={s.text}>{props.checked ? "On" : "Off"}</span>
      <span class={s.track({ checked: props.checked })}>
        <span class={s.thumb} />
      </span>
    </button>
  );
}
