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
  gap: 4,
  borderRadius: 8,
  padding: 3,
  outline: `1px solid color-mix(in srgb, ${theme.color.border} 68%, transparent)`,
  background: `color-mix(in srgb, ${theme.color.deep} 30%, transparent)`,
  overflowX: "auto",
});

export const tabTrigger = style({
  minWidth: 0,
  height: 28,
  border: "none",
  borderRadius: 6,
  padding: "0 12px",
  color: `color-mix(in srgb, ${theme.color.mutedForeground} 78%, transparent)`,
  background: `color-mix(in srgb, ${theme.color.accent} 68%, transparent)`,
  fontSize: "0.75rem",
  fontWeight: 650,
  lineHeight: 1,
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transition: "background 140ms, color 140ms, outline-color 140ms",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      background: `color-mix(in srgb, ${theme.color.accent} 88%, transparent)`,
    },
    "&[data-state='on']": {
      color: theme.color.foreground,
      background: `color-mix(in srgb, ${theme.color.primary} 16%, ${theme.color.accent})`,
      outline: `1px solid color-mix(in srgb, ${theme.color.primary} 48%, transparent)`,
      outlineOffset: -1,
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

export const participantTabRoot = style({
  minWidth: 0,
  display: "grid",
  gap: 10,
});

export const participantTabContent = style({
  minWidth: 0,
  display: "grid",
  gap: 10,
  padding: 10,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.background} 20%, transparent)`,
});

export const participantEmptyState = style({
  minHeight: 92,
  display: "grid",
  placeItems: "center",
  padding: 12,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 54%, transparent)`,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 650,
});
