import type { ReactNode } from "react";
import * as s from "./SettingsFieldRow.css";
import { SettingsHint, type SettingsHintTone } from "./SettingsHint";

interface SettingsFieldRowProps {
  controlAlign?: "stretch" | "start" | "end";
  label: string;
  hint?: string;
  hintTone?: SettingsHintTone;
  settingId?: string;
  scopeTag?: string;
  children?: ReactNode;
}

export function SettingsFieldRow({
  controlAlign = "stretch",
  label,
  hint,
  hintTone = "info",
  settingId,
  scopeTag,
  children,
}: SettingsFieldRowProps) {
  return (
    <div className={s.row} data-setting-id={settingId}>
      <span className={s.label}>
        <span className={s.labelText}>
          <span>{label}</span>
          {hint ? <SettingsHint hint={hint} tone={hintTone} /> : null}
        </span>
        <span className={s.scopeBadge}>{scopeTag ?? ""}</span>
      </span>

      <div className={s.control({ align: controlAlign })}>{children}</div>
    </div>
  );
}
