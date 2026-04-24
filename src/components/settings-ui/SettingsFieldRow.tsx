import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import * as s from "./SettingsFieldRow.css";

interface SettingsFieldRowProps {
  label: string;
  hint?: string;
  hintTone?: "info" | "warning" | "error";
  settingId?: string;
  scopeTag?: string;
  children?: ReactNode;
}

export function SettingsFieldRow({
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
          {hint ? (
            <Tooltip.Root
              lazyMount
              unmountOnExit
              openDelay={200}
              closeDelay={0}
            >
              <Tooltip.Trigger asChild>
                <span
                  className={`${s.hintTrigger} ${s.hintTriggerTone[hintTone]}`}
                >
                  <CircleAlert size={14} />
                </span>
              </Tooltip.Trigger>
              <Portal>
                <Tooltip.Positioner className={s.hintPositioner}>
                  <Tooltip.Content
                    className={`${s.hintContent} ${s.hintContentTone[hintTone]}`}
                  >
                    {hint}
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          ) : null}
        </span>
        <span className={s.scopeBadge}>{scopeTag ?? ""}</span>
      </span>

      <div className={s.control}>{children}</div>
    </div>
  );
}
