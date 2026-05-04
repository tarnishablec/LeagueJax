import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

const scrollbarGutterSize = 12;
const scrollbarTrackSize = 10;

export const root = recipe({
  base: {
    position: "relative",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  variants: {
    size: {
      fill: {
        width: "100%",
        height: "100%",
      },
      content: {
        width: "100%",
        maxHeight: "inherit",
      },
    },
  },
  defaultVariants: {
    size: "fill",
  },
});

export const viewport = recipe({
  base: {
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    scrollbarWidth: "none",
    selectors: {
      "&::-webkit-scrollbar": {
        display: "none",
      },
    },
  },
  variants: {
    size: {
      fill: {
        height: "100%",
      },
      content: {
        maxHeight: "inherit",
      },
    },
  },
  defaultVariants: {
    size: "fill",
  },
});

export const verticalGutter = style({
  paddingInlineEnd: scrollbarGutterSize,
});

export const horizontalGutter = style({
  paddingBlockEnd: scrollbarGutterSize,
});

export const content = style({
  width: "100%",
  minWidth: 0,
});

export const scrollbar = style({
  zIndex: layers.local.scrollbar,
  boxSizing: "border-box",
  opacity: 0,
  transition: "opacity 120ms ease-out",
  selectors: {
    [`${root.classNames.base}:hover &`]: {
      opacity: 1,
    },
    "&[data-scrolling]": {
      opacity: 1,
    },
    "&[data-dragging]": {
      opacity: 1,
    },
    "&[data-orientation='vertical']:not([data-overflow-y])": {
      display: "none",
    },
    "&[data-orientation='horizontal']:not([data-overflow-x])": {
      display: "none",
    },
  },
});

export const verticalScrollbar = style({
  width: scrollbarTrackSize,
  padding: "2px 2px",
});

export const horizontalScrollbar = style({
  height: scrollbarTrackSize,
  padding: "2px 2px",
});

export const thumb = style({
  borderRadius: 999,
  background: `color-mix(in oklch, ${theme.color.foreground} 28%, transparent)`,
  transition: "background 120ms ease-out",
  selectors: {
    "&[data-orientation='vertical']": {
      width: "100%",
      minHeight: 28,
    },
    "&[data-orientation='horizontal']": {
      height: "100%",
      minWidth: 28,
    },
    "&[data-hover], &[data-dragging]": {
      background: `color-mix(in oklch, ${theme.color.foreground} 42%, transparent)`,
    },
  },
});

export const corner = style({
  background: "transparent",
  selectors: {
    '&[data-state="hidden"]': {
      display: "none",
    },
  },
});
