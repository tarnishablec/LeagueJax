import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css.ts";

export const expandedRoot = style({
  display: "grid",
  gap: 6,
  padding: 10,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 72%, transparent)`,
});

export const header = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  alignItems: "center",
  gap: 8,
  "@media": {
    "screen and (max-width: 760px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const tabList = style({
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "minmax(0, 1fr)",
  gap: 2,
  // padding: 4,
  borderRadius: 8,
  outline: `1px solid color-mix(in srgb, ${theme.color.border} 82%, transparent)`,
  background: `color-mix(in srgb, ${theme.color.deep} 38%, transparent)`,
  overflowX: "auto",
});

export const tabTrigger = style({
  minWidth: 0,
  height: 30,
  border: "none",
  borderRadius: 6,
  padding: "0 12px",
  color: theme.color.mutedForeground,
  background: "transparent",
  fontSize: "0.75rem",
  fontWeight: 650,
  lineHeight: 1,
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transition: "background 140ms, color 140ms, box-shadow 140ms",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      background: `color-mix(in srgb, ${theme.color.accent} 56%, transparent)`,
    },
    "&[data-state='on']": {
      color: theme.color.foreground,
      background: `color-mix(in srgb, ${theme.color.accent} 78%, transparent)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
  },
});

export const tabPanel = style({
  minWidth: 0,
});
