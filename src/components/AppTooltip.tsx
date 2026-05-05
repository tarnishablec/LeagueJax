import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import type { ReactNode } from "react";
import * as s from "./AppTooltip.css";

type TooltipPlacement = NonNullable<
  NonNullable<Parameters<typeof Tooltip.Root>[0]>["positioning"]
>["placement"];

interface AppTooltipProps {
  children: ReactNode;
  closeDelay?: number;
  content: ReactNode;
  disabled?: boolean;
  openDelay?: number;
  placement?: TooltipPlacement;
}

export function AppTooltip({
  children,
  closeDelay = 80,
  content,
  disabled = false,
  openDelay = 200,
  placement = "bottom-start",
}: AppTooltipProps) {
  if (disabled || !content) {
    return children;
  }

  return (
    <Tooltip.Root
      lazyMount
      unmountOnExit
      openDelay={openDelay}
      closeDelay={closeDelay}
      positioning={{
        placement,
        gutter: 8,
        slide: false,
        strategy: "fixed",
      }}
    >
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner className={s.positioner}>
          <Tooltip.Content className={s.content}>{content}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
