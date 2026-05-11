import { style } from "@vanilla-extract/css";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

export const trigger = style({
  position: "relative",
});

export const badge = style({
  position: "absolute",
  insetBlockStart: 6,
  insetInlineEnd: 5,
  display: "grid",
  placeItems: "center",
  minWidth: 14,
  height: 14,
  borderRadius: 999,
  paddingInline: 3,
  background: theme.color.primary,
  color: theme.color.accentForeground,
  fontSize: "0.625rem",
  fontWeight: 700,
  lineHeight: 1,
  outline: `1px solid ${theme.color.background}`,
  outlineOffset: -1,
});

export const positioner = style({
  zIndex: layers.overlay.popover,
});

export const content = style({
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  width: 340,
  maxWidth: "calc(100vw - 24px)",
  maxHeight: 420,
  overflow: "hidden",
  borderRadius: 8,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  outline: `1px solid ${theme.color.popoverBorder}`,
  outlineOffset: -1,
  boxShadow: `0 10px 24px oklch(from ${theme.color.foreground} 0.25 c h / 0.2)`,
  selectors: {
    ":root.dark &": {
      boxShadow: `0 10px 24px oklch(from ${theme.color.background} 0.06 c h / 0.6)`,
    },
  },
});

export const header = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  minHeight: 42,
  paddingBlock: 8,
  paddingInline: 12,
  borderBottom: `1px solid ${theme.color.border}`,
});

export const title = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.9rem",
  fontWeight: 650,
  lineHeight: 1.2,
});

export const clearButton = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 5,
  minHeight: 26,
  border: "none",
  borderRadius: 6,
  paddingInline: 8,
  background: "transparent",
  color: theme.color.mutedForeground,
  cursor: "pointer",
  fontSize: "0.75rem",
  lineHeight: 1,
  transition: "background-color 120ms ease-out, color 120ms ease-out",
  selectors: {
    "&:hover:not(:disabled)": {
      background: theme.color.blurry,
      color: theme.color.foreground,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
    "&:disabled": {
      opacity: 0.4,
      pointerEvents: "none",
    },
  },
});

export const list = style({
  display: "grid",
  alignContent: "start",
  gap: 4,
  minHeight: 0,
  margin: 0,
  overflow: "auto",
  padding: 8,
  listStyle: "none",
});

export const itemShell = style({
  display: "block",
  minWidth: 0,
});

export const item = style({
  display: "grid",
  gridTemplateColumns: "8px minmax(0, 1fr)",
  gap: 8,
  alignItems: "start",
  minHeight: 54,
  width: "100%",
  border: "none",
  borderRadius: 7,
  paddingBlock: 9,
  paddingInline: 9,
  background: "transparent",
  color: theme.color.foreground,
  cursor: "default",
  textAlign: "start",
  outline: "1px solid transparent",
  outlineOffset: -1,
  transition:
    "background-color 120ms ease-out, outline-color 120ms ease-out, color 120ms ease-out",
  selectors: {
    '&[data-unread="true"]': {
      background: `color-mix(in oklch, ${theme.color.primary} 10%, transparent)`,
      outlineColor: `color-mix(in oklch, ${theme.color.primary} 22%, transparent)`,
    },
    "&:hover": {
      background: theme.color.blurry,
      outlineColor: theme.color.border,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
  },
});

export const unreadDot = style({
  width: 6,
  height: 6,
  marginBlockStart: 5,
  borderRadius: 999,
  background: theme.color.primary,
  opacity: 0,
  selectors: {
    [`${item}[data-unread="true"] &`]: {
      opacity: 1,
    },
  },
});

export const itemMain = style({
  display: "grid",
  gap: 5,
  minWidth: 0,
});

export const itemHeader = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "baseline",
  minWidth: 0,
});

export const itemTitle = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.8125rem",
  fontWeight: 600,
  lineHeight: 1.25,
});

export const itemTime = style({
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  lineHeight: 1,
});

export const itemBody = style({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1.35,
});

export const empty = style({
  display: "grid",
  placeItems: "center",
  minHeight: 80,
  color: theme.color.mutedForeground,
  fontSize: "0.8125rem",
});
