import { ScrollArea as ArkScrollArea } from "@ark-ui/react/scroll-area";
import type { CSSProperties, ReactNode } from "react";
import * as s from "./ScrollArea.css";

type ScrollAreaOrientation = "vertical" | "horizontal" | "both";
type ScrollAreaSize = "fill" | "content";
type ScrollAreaGutter = "stable" | "overlay";

interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  gutter?: ScrollAreaGutter;
  orientation?: ScrollAreaOrientation;
  showScrollbar?: boolean;
  size?: ScrollAreaSize;
  viewportClassName?: string;
  viewportStyle?: CSSProperties;
}

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

function getViewportOverflowStyle(
  orientation: ScrollAreaOrientation,
): CSSProperties {
  if (orientation === "vertical") {
    return { overflowX: "hidden", overflowY: "auto" };
  }

  if (orientation === "horizontal") {
    return { overflowX: "auto", overflowY: "hidden" };
  }

  return { overflow: "auto" };
}

function getContentBaseStyle(
  orientation: ScrollAreaOrientation,
): CSSProperties {
  if (orientation === "vertical") {
    return { minWidth: 0, width: "100%" };
  }

  return { minWidth: "fit-content" };
}

export function ScrollArea({
  children,
  className,
  contentClassName,
  contentStyle,
  gutter = "stable",
  orientation = "vertical",
  showScrollbar = true,
  size = "fill",
  viewportClassName,
  viewportStyle,
}: ScrollAreaProps) {
  const showVerticalScrollbar =
    showScrollbar && (orientation === "vertical" || orientation === "both");
  const showHorizontalScrollbar =
    showScrollbar && (orientation === "horizontal" || orientation === "both");
  const reserveVerticalGutter = gutter === "stable" && showVerticalScrollbar;
  const reserveHorizontalGutter =
    gutter === "stable" && showHorizontalScrollbar;

  return (
    <ArkScrollArea.Root className={joinClassNames(s.root({ size }), className)}>
      <ArkScrollArea.Viewport
        className={joinClassNames(
          s.viewport({ size }),
          reserveVerticalGutter && s.verticalGutter,
          reserveHorizontalGutter && s.horizontalGutter,
          viewportClassName,
        )}
        style={{
          ...getViewportOverflowStyle(orientation),
          ...viewportStyle,
        }}
      >
        <ArkScrollArea.Content
          className={joinClassNames(s.content, contentClassName)}
          style={{
            ...getContentBaseStyle(orientation),
            ...contentStyle,
          }}
        >
          {children}
        </ArkScrollArea.Content>
      </ArkScrollArea.Viewport>

      {showVerticalScrollbar ? (
        <ArkScrollArea.Scrollbar
          orientation="vertical"
          className={joinClassNames(s.scrollbar, s.verticalScrollbar)}
        >
          <ArkScrollArea.Thumb className={s.thumb} />
        </ArkScrollArea.Scrollbar>
      ) : null}

      {showHorizontalScrollbar ? (
        <ArkScrollArea.Scrollbar
          orientation="horizontal"
          className={joinClassNames(s.scrollbar, s.horizontalScrollbar)}
        >
          <ArkScrollArea.Thumb className={s.thumb} />
        </ArkScrollArea.Scrollbar>
      ) : null}

      {orientation === "both" ? (
        <ArkScrollArea.Corner className={s.corner} />
      ) : null}
    </ArkScrollArea.Root>
  );
}
