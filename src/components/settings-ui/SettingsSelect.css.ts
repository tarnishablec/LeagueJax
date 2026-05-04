import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

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
  border: `1px solid ${theme.color.border}`,
  background: theme.color.surface,
  color: theme.color.foreground,
  padding: "0 10px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: `oklch(from ${theme.color.primary} l c h / 0.45)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 1,
    },
    "&[data-state='open']": {
      borderColor: theme.color.primary,
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
  color: theme.color.mutedForeground,
  display: "grid",
  placeItems: "center",
});

export const positioner = style({
  zIndex: 120,
});

export const content = style({
  marginTop: 4,
  borderRadius: 10,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  boxShadow: `0 10px 24px oklch(from ${theme.color.foreground} 0.25 c h / 0.2)`,
  overflow: "hidden",
  padding: 4,
  minWidth: "var(--reference-width)",
  selectors: {
    ":root.dark &": {
      boxShadow: `0 10px 24px oklch(from ${theme.color.background} 0.06 c h / 0.6)`,
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
  color: theme.color.foreground,
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
      background: `oklch(from ${theme.color.accent} 0.9 c h)`,
    },
    ":root.dark &[data-highlighted]": {
      background: `oklch(from ${theme.color.accent} 0.36 c h / 0.45)`,
    },
    "&[data-state='checked']": {
      background: theme.color.accent,
      color: theme.color.accentForeground,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
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
      borderTop: `1px solid ${theme.color.border}`,
      marginTop: 4,
      paddingTop: 4,
    },
  },
});

export const groupLabel = style({
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
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
