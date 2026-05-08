import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { CircleAlert } from "lucide-react";
import * as s from "./SettingsHint.css";

export type SettingsHintTone = "info" | "warning" | "error";

interface SettingsHintProps {
  hint: string;
  tone?: SettingsHintTone;
}

export function SettingsHint({ hint, tone = "info" }: SettingsHintProps) {
  return (
    <Tooltip.Root
      lazyMount
      unmountOnExit
      openDelay={200}
      closeDelay={80}
      positioning={{
        placement: "bottom-start",
        gutter: 8,
        slide: false,
        flip: false,
        strategy: "fixed",
      }}
    >
      <Tooltip.Trigger asChild>
        <span className={`${s.trigger} ${s.triggerTone[tone]}`}>
          <CircleAlert size={14} aria-hidden="true" />
        </span>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner className={s.positioner}>
          <Tooltip.Content className={`${s.content} ${s.contentTone[tone]}`}>
            {hint}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
