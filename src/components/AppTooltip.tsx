/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";
import * as s from "./AppTooltip.css";

type TooltipPlacement = NonNullable<
  NonNullable<Parameters<typeof Tooltip.Root>[0]>["positioning"]
>["placement"];

type TooltipTriggerProps = {
  (
    userProps?: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  ): JSX.ButtonHTMLAttributes<HTMLButtonElement>;
  <T extends HTMLElement>(
    userProps?: JSX.HTMLAttributes<T>,
  ): JSX.HTMLAttributes<T>;
};

interface AppTooltipProps {
  children: (triggerProps: TooltipTriggerProps) => JSX.Element;
  closeDelay?: number;
  content: JSX.Element;
  disabled?: boolean;
  openDelay?: number;
  placement?: TooltipPlacement;
}

const passthroughTriggerProps = ((userProps: unknown) =>
  userProps ?? {}) as TooltipTriggerProps;

export function AppTooltip(props: AppTooltipProps) {
  if (props.disabled || !props.content) {
    return props.children(passthroughTriggerProps);
  }

  return (
    <Tooltip.Root
      lazyMount
      unmountOnExit
      openDelay={props.openDelay ?? 200}
      closeDelay={props.closeDelay ?? 80}
      positioning={{
        placement: props.placement ?? "bottom-start",
        gutter: 8,
        slide: false,
        strategy: "fixed",
      }}
    >
      <Tooltip.Trigger
        asChild={(triggerProps) => props.children(triggerProps)}
      />
      <Portal>
        <Tooltip.Positioner class={s.positioner}>
          <Tooltip.Content class={s.content}>{props.content}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
