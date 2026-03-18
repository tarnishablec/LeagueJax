import type React from "react";
import * as s from "./SettingsFieldRow.css";

interface SettingsFieldRowProps {
  label: string;
  children?: React.ReactNode;
}

export function SettingsFieldRow({ label, children }: SettingsFieldRowProps) {
  return (
    <div className={s.row}>
      <span className={s.label}>{label}</span>
      <div className={s.control}>{children}</div>
    </div>
  );
}
