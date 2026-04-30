import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  gap: 12,
});

export const description = style({
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: 1.45,
});

export const list = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
  alignItems: "center",
  gap: "8px 12px",
});

export const itemRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const checkboxRoot = style({
  display: "inline-grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "center",
  justifyContent: "start",
  gap: 8,
  minHeight: 28,
  color: vars.color.foreground,
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 2,
      borderRadius: 6,
    },
  },
});

export const checkboxControl = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: "oklch(0.18 0.02 250)",
  display: "grid",
  placeItems: "center",
  transition:
    "background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out",
  selectors: {
    "&[data-state=checked]": {
      background: vars.color.primary,
      borderColor: vars.color.primary,
    },
    [`${checkboxRoot}:hover &`]: {
      borderColor: `color-mix(in oklch, ${vars.color.primary} 58%, ${vars.color.border})`,
    },
  },
});

export const checkboxIndicator = style({
  display: "grid",
  placeItems: "center",
  lineHeight: 1,
});

export const checkboxLabel = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.875rem",
  lineHeight: 1,
});

export const colorPickerGroup = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 6,
});
