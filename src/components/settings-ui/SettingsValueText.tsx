import * as s from "./SettingsValueText.css";

export function SettingsValueText({ value }: { value: string }) {
  return <span className={s.text}>{value}</span>;
}
