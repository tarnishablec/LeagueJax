/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import { CircleAlert } from "lucide-solid";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";
import * as s from "./SettingsHint.css";

export type SettingsHintTone = "info" | "warning" | "error";

interface SettingsHintProps {
  hint: string;
  tone?: SettingsHintTone;
}

export function SettingsHint(props: SettingsHintProps): JSX.Element {
  const tone = () => props.tone ?? "info";

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
      <Tooltip.Trigger
        asChild={(getTriggerProps) => (
          <span
            {...getTriggerProps({
              class: `${s.trigger} ${s.triggerTone[tone()]}`,
            })}
          >
            <CircleAlert size={14} aria-hidden="true" />
          </span>
        )}
      />
      <Portal>
        <Tooltip.Positioner class={s.positioner}>
          <Tooltip.Content class={`${s.content} ${s.contentTone[tone()]}`}>
            {props.hint}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
