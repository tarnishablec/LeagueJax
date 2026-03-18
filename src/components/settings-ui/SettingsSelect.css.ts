import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css";

export const root = style({
  position: "relative",
  minWidth: 180,
});

export const trigger = recipe({
  base: {
    width: "100%",
    height: 32,
    borderRadius: 8,
    border: `1px solid ${vars.color.border}`,
    background: vars.color.background,
    color: vars.color.foreground,
    padding: "0 10px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    textAlign: "left",
    cursor: "pointer",
    selectors: {
      "&:focus-visible": {
        outline: `2px solid ${vars.color.primary}`,
        outlineOffset: 1,
      },
      "&:hover": {
        borderColor: `oklch(from ${vars.color.primary} l c h / 0.45)`,
      },
    },
  },
  variants: {
    open: {
      true: {
        borderColor: vars.color.primary,
      },
      false: {},
    },
  },
  defaultVariants: {
    open: false,
  },
});

export const value = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.875rem",
});

export const chevron = recipe({
  base: {
    color: vars.color.mutedForeground,
    transition: "transform 120ms ease-out, color 120ms ease-out",
  },
  variants: {
    open: {
      true: {
        transform: "rotate(180deg)",
        color: vars.color.foreground,
      },
      false: {},
    },
  },
  defaultVariants: {
    open: false,
  },
});

export const menu = style({
  position: "absolute",
  top: 36,
  left: 0,
  right: 0,
  zIndex: 20,
  borderRadius: 10,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popover,
  boxShadow: `0 10px 24px oklch(from ${vars.color.backgroundRaw} l c h / 0.35)`,
  overflow: "hidden",
  padding: 4,
  display: "grid",
  gap: 2,
});

export const option = recipe({
  base: {
    width: "100%",
    minHeight: 30,
    border: "none",
    borderRadius: 7,
    background: "transparent",
    color: vars.color.foreground,
    textAlign: "left",
    padding: "0 10px",
    cursor: "pointer",
    fontSize: "0.875rem",
    selectors: {
      "&:hover": {
        background: `oklch(from ${vars.color.accent} calc(l + 0.06) c h / 0.4)`,
      },
      "&:focus-visible": {
        outline: `2px solid ${vars.color.primary}`,
        outlineOffset: -1,
      },
    },
  },
  variants: {
    selected: {
      true: {
        background: vars.color.accent,
        color: vars.color.accentForeground,
      },
      false: {},
    },
  },
  defaultVariants: {
    selected: false,
  },
});
