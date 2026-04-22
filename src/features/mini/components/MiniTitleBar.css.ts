import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css.ts";

export const header = style({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  height: 36,
  background: "transparent",
  borderBottom: `1px solid ${vars.color.border}`,
  userSelect: "none",
});

export const dragZone = style({
  display: "grid",
  alignItems: "center",
  paddingInline: 10,
  fontSize: "0.72rem",
  color: vars.color.mutedForeground,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
});

export const controls = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
});

export const windowButton = style({
  selectors: {
    '&[aria-pressed="true"]': {
      background: `oklch(from ${vars.color.primary} l c h / 0.14)`,
      color: vars.color.primary,
    },
    '&[aria-pressed="true"]:hover': {
      background: `oklch(from ${vars.color.primary} l c h / 0.22)`,
      color: vars.color.primary,
    },
    ':root[data-mini-hover-suspended="true"] &:hover': {
      background: "transparent",
      color: `oklch(from ${vars.color.foreground} l c h / 0.7)`,
    },
    ':root[data-mini-hover-suspended="true"] &[aria-pressed="true"]': {
      background: `oklch(from ${vars.color.primary} l c h / 0.14)`,
      color: vars.color.primary,
    },
  },
});
