import { ScrollArea as ArkScrollArea } from "@ark-ui/react/scroll-area";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { CSSProperties, ReactNode } from "react";
import * as s from "./ScrollArea.css";

type ScrollAreaMode = "inline" | "overlay" | "outset";
type ScrollAreaDirection = "horizontal" | "vertical" | "both";

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  direction?: ScrollAreaDirection;
  mode?: ScrollAreaMode;
  outsetWidth?: string;
  scrollbarClassName?: string;
  scrollbarSize?: string;
  thumbClassName?: string;
  viewportClassName?: string;
};

function cx(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function hasVerticalScrollbar(direction: ScrollAreaDirection) {
  return direction === "vertical" || direction === "both";
}

function hasHorizontalScrollbar(direction: ScrollAreaDirection) {
  return direction === "horizontal" || direction === "both";
}

function viewportStyle(
  mode: ScrollAreaMode,
  direction: ScrollAreaDirection,
): CSSProperties {
  const vertical = hasVerticalScrollbar(direction);
  const horizontal = hasHorizontalScrollbar(direction);

  return {
    overflowX: horizontal ? "auto" : "hidden",
    overflowY: vertical ? "auto" : "hidden",
    ...(mode === "inline" && vertical
      ? { paddingInlineEnd: s.scrollAreaScrollbarSizeValue }
      : {}),
    ...(mode === "inline" && horizontal
      ? { paddingBlockEnd: s.scrollAreaScrollbarSizeValue }
      : {}),
  };
}

const contentStyle: CSSProperties = {
  minWidth: 0,
};

function verticalScrollbarStyle(mode: ScrollAreaMode): CSSProperties {
  return {
    top: 0,
    bottom: 0,
    insetInlineEnd:
      mode === "outset" ? `calc(0px - ${s.scrollAreaOutsetWidthValue})` : 0,
  };
}

function horizontalScrollbarStyle(mode: ScrollAreaMode): CSSProperties {
  return {
    insetInlineStart: 0,
    insetInlineEnd: 0,
    bottom:
      mode === "outset" ? `calc(0px - ${s.scrollAreaOutsetWidthValue})` : 0,
  };
}

export function ScrollArea({
  children,
  className,
  contentClassName,
  direction = "vertical",
  mode = "overlay",
  outsetWidth,
  scrollbarClassName,
  scrollbarSize,
  thumbClassName,
  viewportClassName,
}: ScrollAreaProps) {
  const vertical = hasVerticalScrollbar(direction);
  const horizontal = hasHorizontalScrollbar(direction);

  return (
    <ArkScrollArea.Root
      className={cx(s.root, className)}
      style={assignInlineVars({
        [s.scrollAreaOutsetWidth]: outsetWidth,
        [s.scrollAreaScrollbarSize]: scrollbarSize,
      })}
    >
      <ArkScrollArea.Viewport
        className={cx(s.viewport, viewportClassName)}
        style={viewportStyle(mode, direction)}
      >
        <ArkScrollArea.Content
          className={cx(s.content, contentClassName)}
          style={contentStyle}
        >
          {children}
        </ArkScrollArea.Content>
      </ArkScrollArea.Viewport>

      {vertical ? (
        <ArkScrollArea.Scrollbar
          className={cx(s.verticalScrollbar, scrollbarClassName)}
          data-scroll-mode={mode}
          orientation="vertical"
          style={verticalScrollbarStyle(mode)}
        >
          <ArkScrollArea.Thumb className={cx(s.thumb, thumbClassName)} />
        </ArkScrollArea.Scrollbar>
      ) : null}

      {horizontal ? (
        <ArkScrollArea.Scrollbar
          className={cx(s.horizontalScrollbar, scrollbarClassName)}
          data-scroll-mode={mode}
          orientation="horizontal"
          style={horizontalScrollbarStyle(mode)}
        >
          <ArkScrollArea.Thumb className={cx(s.thumb, thumbClassName)} />
        </ArkScrollArea.Scrollbar>
      ) : null}
    </ArkScrollArea.Root>
  );
}
