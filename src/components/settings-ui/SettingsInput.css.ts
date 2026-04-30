import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const input = style({
  minWidth: 180,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.foreground,
  paddingInline: 10,
  fontSize: "0.875rem",
  selectors: {
    "&:hover": {
      borderColor: `oklch(from ${vars.color.primary} l c h / 0.45)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const numberRoot = style({
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.foreground,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "stretch",
  overflow: "hidden",
  selectors: {
    "&:hover": {
      borderColor: `oklch(from ${vars.color.primary} l c h / 0.45)`,
    },
    "&:focus-within": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const numberInput = style({
  minWidth: 0,
  width: "100%",
  height: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: vars.color.foreground,
  fontSize: "0.875rem",
  paddingInline: 10,
});

export const numberControl = style({
  height: "100%",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  borderLeft: `1px solid ${vars.color.border}`,
});

export const numberTrigger = style({
  minWidth: 24,
  border: "none",
  background: "transparent",
  color: vars.color.foreground,
  display: "grid",
  placeItems: "center",
  lineHeight: 1,
  fontSize: "0.875rem",
  cursor: "pointer",
  userSelect: "none",
  selectors: {
    "&:hover": {
      background: `oklch(from ${vars.color.accent} 0.9 c h)`,
    },
    ":root.dark &:hover": {
      background: `oklch(from ${vars.color.accent} 0.36 c h / 0.45)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: -1,
    },
    "&[data-disabled]": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
});

export const numberTriggerDecrement = style({
  borderRight: `1px solid ${vars.color.border}`,
});

export const numberTriggerIncrement = style({});
