import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const root = style({
  minWidth: 0,
});

export const control = style({
  width: "100%",
  minWidth: 0,
  height: "100%",
});

export const trigger = style({
  width: "100%",
  height: "100%",
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.foreground,
  padding: "0 10px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: `oklch(from ${vars.color.primary} l c h / 0.45)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
    "&[data-state='open']": {
      borderColor: vars.color.primary,
    },
    "&[data-disabled]": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
});

export const valueText = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.875rem",
});

export const indicator = style({
  color: vars.color.mutedForeground,
  display: "grid",
  placeItems: "center",
});

export const positioner = style({
  zIndex: 120,
});

export const content = style({
  marginTop: 4,
  borderRadius: 10,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  boxShadow: `0 10px 24px oklch(from ${vars.color.foreground} 0.25 c h / 0.2)`,
  overflow: "hidden",
  padding: 4,
  minWidth: "var(--reference-width)",
  selectors: {
    ":root.dark &": {
      boxShadow: `0 10px 24px oklch(from ${vars.color.background} 0.06 c h / 0.6)`,
    },
  },
});

export const list = style({
  display: "grid",
  gap: 2,
});

export const item = style({
  width: "100%",
  minHeight: 30,
  borderRadius: 7,
  background: "transparent",
  color: vars.color.foreground,
  textAlign: "left",
  padding: "0 10px",
  cursor: "pointer",
  fontSize: "0.875rem",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  selectors: {
    "&[data-highlighted]": {
      background: `oklch(from ${vars.color.accent} 0.9 c h)`,
    },
    ":root.dark &[data-highlighted]": {
      background: `oklch(from ${vars.color.accent} 0.36 c h / 0.45)`,
    },
    "&[data-state='checked']": {
      background: vars.color.accent,
      color: vars.color.accentForeground,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: -1,
    },
  },
});

export const itemText = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const group = style({
  display: "grid",
  gap: 2,
  selectors: {
    "& + &": {
      borderTop: `1px solid ${vars.color.border}`,
      marginTop: 4,
      paddingTop: 4,
    },
  },
});

export const groupLabel = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
  padding: "4px 10px 2px",
  userSelect: "none",
});

export const itemIndicator = style({
  display: "grid",
  placeItems: "center",
  opacity: 0,
  transition: "opacity 100ms ease-out",
  selectors: {
    "[data-state='checked'] &": {
      opacity: 1,
    },
  },
});
