import { createVar, fallbackVar, style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const scrollAreaOutsetWidth = createVar();
export const scrollAreaScrollbarSize = createVar();

export const scrollAreaOutsetWidthValue = fallbackVar(
  scrollAreaOutsetWidth,
  "0px",
);
export const scrollAreaScrollbarSizeValue = fallbackVar(
  scrollAreaScrollbarSize,
  "8px",
);
const verticalOutsetTrackSize = fallbackVar(
  scrollAreaOutsetWidth,
  scrollAreaScrollbarSizeValue,
);
const horizontalOutsetTrackSize = fallbackVar(
  scrollAreaOutsetWidth,
  scrollAreaScrollbarSizeValue,
);

export const root = style({
  position: "relative",
  display: "grid",
  minWidth: 0,
  minHeight: 0,
  overflow: "visible",
});

export const viewport = style({
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": {
      display: "none",
      width: 0,
      height: 0,
    },
  },
});

export const content = style({
  width: "100%",
  minWidth: 0,
});

export const verticalScrollbar = style({
  display: "grid",
  justifyItems: "center",
  selectors: {
    "&:not([data-overflow-y])": {
      display: "none",
    },
    '&[data-scroll-mode="inline"], &[data-scroll-mode="overlay"]': {
      width: scrollAreaScrollbarSizeValue,
    },
    '&[data-scroll-mode="outset"]': {
      width: verticalOutsetTrackSize,
    },
  },
});

export const horizontalScrollbar = style({
  display: "grid",
  alignItems: "center",
  selectors: {
    "&:not([data-overflow-x])": {
      display: "none",
    },
    '&[data-scroll-mode="inline"], &[data-scroll-mode="overlay"]': {
      height: scrollAreaScrollbarSizeValue,
    },
    '&[data-scroll-mode="outset"]': {
      height: horizontalOutsetTrackSize,
    },
  },
});

export const thumb = style({
  borderRadius: 999,
  background: `oklch(from ${theme.color.foreground} l c h / 0.35)`,
  transition: "background 120ms",
  selectors: {
    '&[data-orientation="vertical"]': {
      width: 4,
    },
    '&[data-orientation="horizontal"]': {
      height: 4,
    },
    "&[data-hover], &[data-dragging]": {
      background: `oklch(from ${theme.color.foreground} l c h / 0.5)`,
    },
  },
});
