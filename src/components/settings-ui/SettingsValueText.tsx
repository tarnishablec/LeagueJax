import {
  type SettingsControlLayoutProps,
  settingsControlClassName,
  settingsControlStyle,
} from "./SettingsControl";
import * as s from "./SettingsValueText.css";

interface SettingsValueTextProps extends SettingsControlLayoutProps {
  value: string;
}

export function SettingsValueText({
  className,
  fit,
  height,
  size,
  value,
  width,
}: SettingsValueTextProps) {
  return (
    <span
      className={`${settingsControlClassName({ className, fit, size })} ${s.text}`}
      style={settingsControlStyle({ fit, height, size, width })}
    >
      {value}
    </span>
  );
}
