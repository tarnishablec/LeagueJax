import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { theme } from "@/styles/theme.css";

const spin = keyframes({
  to: {
    transform: "rotate(360deg)",
  },
});

export const root = style({
  display: "grid",
  gridTemplateRows: "min-content min-content 1fr 1fr",
  gap: 12,
  minHeight: 0,
});

export const toolbar = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  "@media": {
    "(max-width: 980px)": {
      gridTemplateColumns: "1fr",
      alignItems: "start",
    },
  },
});

export const heading = style({
  display: "grid",
  alignItems: "center",
  minWidth: 0,
});

export const subtle = style({
  color: theme.color.mutedForeground,
  fontSize: "0.8125rem",
  lineHeight: 1.25,
});

export const actions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "end",
  gap: 8,
  minWidth: 0,
  flexWrap: "wrap",
});

export const notificationControl = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 8,
  minHeight: 30,
  color: theme.color.foreground,
  fontSize: "0.8125rem",
});

export const actionButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 30,
  border: "none",
  borderRadius: 7,
  padding: "0 10px",
  background: theme.color.surface,
  color: theme.color.foreground,
  cursor: "pointer",
  fontSize: "0.8125rem",
  lineHeight: 1,
  whiteSpace: "nowrap",
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  transition:
    "outline-color 120ms ease-out, color 120ms ease-out, opacity 120ms ease-out",
  selectors: {
    "&:hover:not(:disabled)": {
      color: theme.color.primary,
      outlineColor: `color-mix(in oklch, ${theme.color.primary} 60%, ${theme.color.border})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
    "&:disabled": {
      opacity: 0.45,
      pointerEvents: "none",
    },
  },
});

export const statusRow = style({
  minHeight: 34,
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  borderRadius: 7,
  padding: "0 10px",
  color: theme.color.mutedForeground,
  background: theme.color.surface,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  fontSize: "0.8125rem",
  selectors: {
    '&[data-tone="error"]': {
      color: theme.color.error,
      background: `color-mix(in oklch, ${theme.color.error} 12%, transparent)`,
      outlineColor: `color-mix(in oklch, ${theme.color.error} 26%, transparent)`,
    },
  },
});

export const statusLabel = style({
  flex: "0 0 auto",
  color: theme.color.mutedForeground,
});

export const statusText = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const sections = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  alignItems: "start",
  gap: 12,
  minWidth: 0,
  "@media": {
    "(max-width: 1320px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "(max-width: 860px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const section = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  position: "relative",
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
  borderRadius: 8,
  background: `color-mix(in oklch, ${theme.color.background} 82%, ${theme.color.surface})`,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  selectors: {
    '&[data-busy="true"]': {
      cursor: "progress",
    },
  },
});

export const sectionHeader = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  minHeight: 38,
  padding: "0 10px",
  background: theme.color.surface,
});

export const sectionTitle = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  color: theme.color.foreground,
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: 1,
});

export const sectionTitleText = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const sectionCount = style({
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
});

export const itemList = style({
  display: "grid",
  alignContent: "start",
});

export const itemRow = style({
  display: "grid",
  gridTemplateColumns: "20px 32px 1fr auto",
  width: "100%",
  alignItems: "center",
  justifySelf: "start",
  gap: 8,
  height: "min-content",
  padding: "8px 10px",
  borderTop: `1px solid ${theme.color.border}`,
  selectors: {
    "&[data-status=skipped]": {
      color: theme.color.mutedForeground,
    },
  },
});

export const checkboxRoot = style({
  display: "grid",
  placeItems: "center",
  width: 20,
  height: 20,
  cursor: "pointer",
  selectors: {
    "&[data-disabled]": {
      cursor: "default",
      opacity: 0.5,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
      borderRadius: 4,
    },
  },
});

export const checkboxControl = style({
  display: "grid",
  placeItems: "center",
  width: 18,
  height: 18,
  borderRadius: 4,
  background: theme.color.surface,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  transition: "background-color 120ms ease-out, outline-color 120ms ease-out",
  selectors: {
    "&[data-state=checked]": {
      background: theme.color.primary,
      outlineColor: theme.color.primary,
    },
  },
});

export const checkboxIndicator = style({
  display: "grid",
  placeItems: "center",
  color: "rgb(20 20 20)",
});

export const itemImage = style({
  width: 32,
  height: 32,
  borderRadius: 6,
  objectFit: "cover",
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
});

export const itemImageFallback = style({
  width: 32,
  height: 32,
  borderRadius: 6,
  display: "grid",
  placeItems: "center",
  background: theme.color.surface,
  color: theme.color.mutedForeground,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
});

export const itemMain = style({
  display: "grid",
  gap: 5,
  minWidth: 0,
});

export const itemTitleLine = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

export const itemTitle = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.foreground,
  fontSize: "0.875rem",
  fontWeight: 550,
  lineHeight: 1.1,
});

export const quantity = style({
  flex: "0 0 auto",
  color: theme.color.primary,
  fontSize: "0.75rem",
  fontWeight: 650,
});

export const itemMeta = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1.2,
});

export const itemMetaText = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const childList = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  overflow: "hidden",
});

export const childItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  minWidth: 0,
  maxWidth: "10rem",
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1,
});

export const childText = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const childImage = style({
  width: 16,
  height: 16,
  borderRadius: 4,
  objectFit: "cover",
});

export const childImageFallback = style({
  width: 16,
  height: 16,
  borderRadius: 4,
  background: theme.color.surface,
});

export const statusPill = recipe({
  base: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: 44,
    minHeight: 22,
    borderRadius: 999,
    padding: "0 8px",
    fontSize: "0.75rem",
    lineHeight: 1,
    outline: `1px solid ${theme.color.border}`,
    outlineOffset: -1,
  },
  variants: {
    status: {
      claimable: {
        color: theme.color.success,
        background: `color-mix(in oklch, ${theme.color.success} 10%, transparent)`,
      },
      skipped: {
        color: theme.color.mutedForeground,
        background: theme.color.surface,
      },
    },
  },
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  minHeight: 0,
  height: "100%",
  color: theme.color.mutedForeground,
  fontSize: "0.875rem",
  borderTop: `1px solid ${theme.color.border}`,
});

export const activitySection = style([section]);

export const panelBusyOverlay = style({
  position: "absolute",
  inset: "38px 0 0",
  zIndex: 1,
  display: "grid",
  placeItems: "center",
  background: `color-mix(in oklch, ${theme.color.background} 68%, transparent)`,
  color: theme.color.primary,
  pointerEvents: "auto",
});

export const busyIcon = style({
  animation: `${spin} 900ms linear infinite`,
});

export const activityList = style({
  display: "grid",
  alignContent: "start",
});

export const activityRow = style({
  display: "grid",
  gridTemplateColumns: "4.5rem 5rem minmax(0, 1fr)",
  gap: 8,
  alignItems: "center",
  justifySelf: "start",
  height: "min-content",
  padding: "6px 10px",
  borderTop: `1px solid ${theme.color.border}`,
  color: theme.color.foreground,
  fontSize: "0.8125rem",
  selectors: {
    "&[data-level=warning]": {
      color: theme.color.primary,
    },
    "&[data-level=error]": {
      color: theme.color.error,
    },
  },
});

export const activityTime = style({
  color: theme.color.mutedForeground,
  fontVariantNumeric: "tabular-nums",
});

export const activityMessage = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
