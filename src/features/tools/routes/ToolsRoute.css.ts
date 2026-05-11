import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 16,
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  padding: "12px",
  paddingTop: 4,
});

export const segmentRoot = style({
  position: "relative",
  display: "flex",
  gap: 2,
  alignItems: "end",
  minWidth: 0,
  minHeight: 34,
  overflowX: "auto",
  overflowY: "hidden",
  borderBottom: `1px solid ${theme.color.border}`,
});

export const segmentItem = style({
  position: "relative",
  display: "grid",
  flex: "0 0 auto",
  placeItems: "center",
  minHeight: 32,
  border: "none",
  borderRadius: "6px 6px 0 0",
  padding: "0 12px",
  color: theme.color.mutedForeground,
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.875rem",
  lineHeight: 1,
  whiteSpace: "nowrap",
  transition: "background 120ms ease-out",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      background: theme.color.surface,
    },
    "&[data-state=checked]": {
      color: theme.color.foreground,
    },
    "&[data-state=checked]::after": {
      content: '""',
      position: "absolute",
      left: 1,
      right: 1,
      bottom: -1,
      height: 2,
      borderRadius: 999,
      background: theme.color.primary,
    },
    "&[data-checked]": {
      color: theme.color.foreground,
    },
    "&[data-checked]::after": {
      content: '""',
      position: "absolute",
      left: 1,
      right: 1,
      bottom: -1,
      height: 2,
      borderRadius: 999,
      background: theme.color.primary,
    },
    "&:focus-visible": {
      outline: `1px solid ${theme.color.primary}`,
      outlineOffset: -1,
    },
  },
});

export const content = style({
  display: "grid",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
});
