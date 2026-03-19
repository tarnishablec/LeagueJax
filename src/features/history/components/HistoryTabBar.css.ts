import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css.ts";

export const container = style({
  position: "relative",
  display: "grid",
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
});

export const viewport = style({
  display: "grid",
  width: "100%",
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
});

export const track = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "start",
  minWidth: "max-content",
  width: "max-content",
});

export const tab = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 16px",
    alignItems: "center",
    gap: 6,
    height: 32,
    maxWidth: 140,
    paddingInline: 8,
    fontSize: "0.75rem",
    color: vars.color.mutedForeground,
    cursor: "default",
    background: "transparent",
    whiteSpace: "nowrap",
    borderBottom: "2px solid transparent",
    transition: "color 100ms, background 100ms",
    borderRadius: "4px 4px 0 0",
    selectors: {
      "&:hover": {
        color: vars.color.foreground,
        background: vars.color.accent,
      },
    },
  },
  variants: {
    active: {
      true: {
        color: vars.color.foreground,
        borderBottomColor: vars.color.primary,
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const tabMain = style({
  display: "grid",
  gridTemplateColumns: "16px minmax(0, 1fr)",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  height: "100%",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  padding: 0,
  margin: 0,
  font: "inherit",
  textAlign: "start",
});

export const tabLabel = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: "0.75rem",
  lineHeight: 1,
});

export const tabIcon = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  objectFit: "cover",
});

export const tabIconFallback = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  background: vars.color.accent,
});

export const closeButton = style({
  display: "grid",
  placeItems: "center",
  width: 16,
  height: 16,
  borderRadius: 4,
  border: "none",
  background: "transparent",
  color: vars.color.mutedForeground,
  cursor: "pointer",
  padding: 0,
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.accent,
    },
  },
});

export const overflowFade = recipe({
  base: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 24,
    pointerEvents: "none",
    opacity: 0,
    transition: "opacity 120ms ease-out",
    zIndex: 1,
  },
  variants: {
    side: {
      left: {
        left: 0,
        background: `linear-gradient(to right, oklch(from ${vars.color.background} l c h / 0.96), oklch(from ${vars.color.background} l c h / 0))`,
      },
      right: {
        right: 0,
        background: `linear-gradient(to left, oklch(from ${vars.color.background} l c h / 0.96), oklch(from ${vars.color.background} l c h / 0))`,
      },
    },
    visible: {
      true: {
        opacity: 1,
      },
      false: {
        opacity: 0,
      },
    },
  },
});

export const contextMenuPositioner = style({
  zIndex: 80,
});

export const contextMenuContent = style({
  minWidth: 180,
  borderRadius: 10,
  border: `1px solid ${vars.settings.selectMenuBorder}`,
  background: vars.settings.selectMenuBg,
  boxShadow: `0 10px 24px ${vars.settings.selectMenuShadow}`,
  overflow: "hidden",
  padding: 4,
});

export const contextMenuItem = style({
  minHeight: 30,
  borderRadius: 7,
  padding: "0 10px",
  display: "grid",
  alignItems: "center",
  cursor: "pointer",
  color: vars.settings.controlText,
  fontSize: "0.8125rem",
  selectors: {
    "&[data-highlighted]": {
      background: vars.settings.selectOptionHoverBg,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: -1,
    },
    "&[data-disabled]": {
      color: vars.color.mutedForeground,
      cursor: "not-allowed",
    },
  },
});

export const contextMenuSeparator = style({
  height: 1,
  margin: "4px 2px",
  background: vars.settings.selectMenuBorder,
});
