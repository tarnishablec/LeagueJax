import type React from "react";
import * as s from "./SettingsFieldRow.css";

interface SettingsFieldRowProps {
  label: string;
  scopeTag?: string;
  children?: React.ReactNode;
}

export function SettingsFieldRow({
  label,
  scopeTag,
  children,
}: SettingsFieldRowProps) {
  return (
    <div className={s.row}>
      <span className={s.label}>
        <span>{label}</span>
        <span className={s.scopeBadge}>{scopeTag ?? ""}</span>
      </span>

      <div className={s.control}>{children}</div>
    </div>
  );
}
