import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css.ts";

export const expandedRoot = style({
  display: "grid",
  gap: 10,
  padding: 10,
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 72%, transparent)`,
});

export const tabList = style({
  width: "max-content",
  maxWidth: "100%",
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  gap: 4,
  padding: 3,
  borderRadius: 7,
  border: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.deep} 28%, transparent)`,
  overflowX: "auto",
});

export const tabTrigger = style({
  minWidth: 64,
  height: 26,
  border: "none",
  borderRadius: 5,
  padding: "0 10px",
  color: theme.color.mutedForeground,
  background: "transparent",
  fontSize: "0.75rem",
  fontWeight: 600,
  lineHeight: 1,
  cursor: "pointer",
  transition: "background 140ms, color 140ms",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      background: theme.color.accent,
    },
    "&[data-state='on']": {
      color: theme.color.accentForeground,
      background: theme.color.primary,
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
