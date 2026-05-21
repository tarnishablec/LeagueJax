/** @jsxImportSource solid-js */
import { ScrollArea as ArkScrollArea } from "@ark-ui/solid/scroll-area";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import * as s from "./ScrollArea.css.ts";

type ScrollAreaMode = "inline" | "overlay" | "outset";
type ScrollAreaDirection = "horizontal" | "vertical" | "both";

type ScrollAreaProps = {
  children: JSX.Element;
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
): JSX.CSSProperties {
  const vertical = hasVerticalScrollbar(direction);
  const horizontal = hasHorizontalScrollbar(direction);

  return {
    "overflow-x": horizontal ? "auto" : "hidden",
    "overflow-y": vertical ? "auto" : "hidden",
    ...(mode === "inline" && vertical
      ? { "padding-inline-end": s.scrollAreaScrollbarSizeValue }
      : {}),
    ...(mode === "inline" && horizontal
      ? { "padding-block-end": s.scrollAreaScrollbarSizeValue }
      : {}),
  };
}

const contentStyle: JSX.CSSProperties = {
  "min-width": 0,
};

function verticalScrollbarStyle(mode: ScrollAreaMode): JSX.CSSProperties {
  return {
    top: "0",
    bottom: "0",
    "inset-inline-end":
      mode === "outset" ? `calc(0px - ${s.scrollAreaOutsetWidthValue})` : "0",
  };
}

function horizontalScrollbarStyle(mode: ScrollAreaMode): JSX.CSSProperties {
  return {
    "inset-inline-start": "0",
    "inset-inline-end": "0",
    bottom:
      mode === "outset" ? `calc(0px - ${s.scrollAreaOutsetWidthValue})` : "0",
  };
}

export function ScrollArea(props: ScrollAreaProps): JSX.Element {
  const direction = () => props.direction ?? "vertical";
  const mode = () => props.mode ?? "overlay";
  const vertical = () => hasVerticalScrollbar(direction());
  const horizontal = () => hasHorizontalScrollbar(direction());

  return (
    <ArkScrollArea.Root
      class={cx(s.root, props.className)}
      style={assignInlineVars({
        [s.scrollAreaOutsetWidth]: props.outsetWidth,
        [s.scrollAreaScrollbarSize]: props.scrollbarSize,
      })}
    >
      <ArkScrollArea.Viewport
        class={cx(s.viewport, props.viewportClassName)}
        style={viewportStyle(mode(), direction())}
      >
        <ArkScrollArea.Content
          class={cx(s.content, props.contentClassName)}
          style={contentStyle}
        >
          {props.children}
        </ArkScrollArea.Content>
      </ArkScrollArea.Viewport>

      <Show when={vertical()}>
        <ArkScrollArea.Scrollbar
          class={cx(s.verticalScrollbar, props.scrollbarClassName)}
          data-scroll-mode={mode()}
          orientation="vertical"
          style={verticalScrollbarStyle(mode())}
        >
          <ArkScrollArea.Thumb class={cx(s.thumb, props.thumbClassName)} />
        </ArkScrollArea.Scrollbar>
      </Show>

      <Show when={horizontal()}>
        <ArkScrollArea.Scrollbar
          class={cx(s.horizontalScrollbar, props.scrollbarClassName)}
          data-scroll-mode={mode()}
          orientation="horizontal"
          style={horizontalScrollbarStyle(mode())}
        >
          <ArkScrollArea.Thumb class={cx(s.thumb, props.thumbClassName)} />
        </ArkScrollArea.Scrollbar>
      </Show>
    </ArkScrollArea.Root>
  );
}
