import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 12,
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
});

export const toolbar = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  minHeight: 38,
  "@media": {
    "(max-width: 760px)": {
      gridTemplateColumns: "1fr",
      alignItems: "start",
    },
  },
});

export const main = style({
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  minHeight: 0,
  overflow: "hidden",
});

export const statusCluster = style({
  display: "grid",
  gridTemplateColumns: "24px minmax(0, max-content)",
  alignItems: "center",
  gap: 8,
  minHeight: 34,
  minWidth: 0,
  color: theme.color.mutedForeground,
  selectors: {
    '&[data-running="true"]': {
      color: theme.color.foreground,
    },
  },
});

export const statusMain = style({
  display: "inline-grid",
  gridTemplateColumns: "max-content",
  alignItems: "center",
  minWidth: 0,
  height: 34,
  "@media": {
    "(max-width: 760px)": {
      gridTemplateColumns: "1fr",
      gap: 6,
    },
  },
});

export const serverControls = style({
  display: "inline-grid",
  gridTemplateColumns: "max-content auto",
  alignItems: "center",
  justifyContent: "end",
  gap: 12,
  minWidth: 0,
  height: 34,
  "@media": {
    "(max-width: 760px)": {
      justifyContent: "start",
    },
  },
});

export const statusIcon = style({
  display: "grid",
  placeItems: "center",
  width: 24,
  height: 24,
  borderRadius: 7,
  background: theme.color.surface,
  color: theme.color.mutedForeground,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  selectors: {
    [`${statusCluster}[data-running="true"] &`]: {
      color: theme.color.success,
      outlineColor: `color-mix(in oklch, ${theme.color.success} 38%, ${theme.color.border})`,
      background: `color-mix(in oklch, ${theme.color.success} 10%, ${theme.color.surface})`,
    },
  },
});

export const statusText = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: 1,
});

export const actionButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  minWidth: 78,
  minHeight: 34,
  border: "none",
  borderRadius: 7,
  padding: "0 11px",
  background: theme.color.primary,
  color: "rgb(20 20 20)",
  cursor: "pointer",
  fontSize: "0.8125rem",
  fontWeight: 650,
  lineHeight: 1,
  whiteSpace: "nowrap",
  outline: `1px solid ${theme.color.primary}`,
  outlineOffset: -1,
  transition:
    "background-color 140ms ease, color 140ms ease, outline-color 140ms ease, opacity 140ms ease",
  selectors: {
    '&[data-running="true"]': {
      background: theme.color.surface,
      color: theme.color.foreground,
      outlineColor: theme.color.border,
    },
    '&[data-running="true"]:hover:not(:disabled)': {
      outlineColor: `color-mix(in oklch, ${theme.color.error} 72%, ${theme.color.border})`,
    },
    "&:hover:not(:disabled)": {
      outlineColor: `color-mix(in oklch, ${theme.color.primary} 70%, ${theme.color.border})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
    "&:disabled": {
      opacity: 0.55,
      pointerEvents: "none",
    },
  },
});

export const sectionHeader = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, max-content) auto minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  padding: "0 10px",
  color: theme.color.foreground,
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: 1,
});

export const sectionCount = style({
  display: "inline-grid",
  placeItems: "center",
  minWidth: 22,
  height: 20,
  borderRadius: 999,
  padding: "0 7px",
  background: theme.color.blurry,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 650,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
});

export const headerActionButton = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  justifySelf: "end",
  gap: 5,
  minHeight: 26,
  border: "none",
  borderRadius: 6,
  padding: "0 8px",
  background: "transparent",
  color: theme.color.mutedForeground,
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 600,
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

export const endpointEditor = style({
  appearance: "none",
  display: "grid",
  gridTemplateColumns: "max-content 1px 58px max-content 28px",
  gap: 8,
  alignItems: "center",
  width: "max-content",
  maxWidth: "100%",
  height: 34,
  color: theme.color.foreground,
  fontSize: "0.8125rem",
  lineHeight: 1,
  textAlign: "left",
  transition: "color 140ms ease",
  selectors: {
    '&[data-invalid="true"]': {
      color: theme.color.error,
    },
  },
});

export const endpointHostText = style({
  display: "grid",
  placeItems: "center",
  height: 34,
  color: `color-mix(in oklch, ${theme.color.mutedForeground} 88%, ${theme.color.foreground})`,
  fontWeight: 620,
  letterSpacing: 0,
  whiteSpace: "nowrap",
  userSelect: "text",
});

export const endpointDivider = style({
  width: 1,
  height: 16,
  background: `color-mix(in oklch, ${theme.color.border} 78%, ${theme.color.mutedForeground})`,
  borderRadius: 999,
});

export const endpointPortInput = style({
  width: "100%",
  minWidth: 0,
  height: 28,
  border: 0,
  borderRadius: 6,
  margin: 0,
  padding: "0 6px",
  background: `color-mix(in oklch, ${theme.color.surface} 74%, ${theme.color.background})`,
  color: theme.color.foreground,
  font: "inherit",
  fontSize: "0.8125rem",
  fontWeight: 700,
  lineHeight: 1,
  textAlign: "center",
  outline: `1px solid color-mix(in oklch, ${theme.color.border} 84%, ${theme.color.surface})`,
  outlineOffset: -1,
  transition:
    "background-color 140ms ease, color 140ms ease, outline-color 140ms ease",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: -1,
      background: theme.color.surface,
    },
    "&:hover:not(:disabled)": {
      outlineColor: `color-mix(in oklch, ${theme.color.primary} 45%, ${theme.color.border})`,
      background: theme.color.surface,
    },
    "&:disabled": {
      color: theme.color.foreground,
      cursor: "not-allowed",
      opacity: 0.76,
    },
    [`${endpointEditor}[data-invalid="true"] &`]: {
      outlineColor: `color-mix(in oklch, ${theme.color.error} 72%, ${theme.color.border})`,
      color: theme.color.error,
    },
  },
});

export const endpointRouteText = style({
  display: "grid",
  placeItems: "center",
  height: 34,
  color: `color-mix(in oklch, ${theme.color.mutedForeground} 88%, ${theme.color.foreground})`,
  fontWeight: 620,
  letterSpacing: 0,
  whiteSpace: "nowrap",
  userSelect: "text",
});

export const endpointCopyButton = style({
  appearance: "none",
  border: 0,
  display: "grid",
  placeItems: "center",
  width: 28,
  height: 28,
  borderRadius: 6,
  padding: 0,
  background: `color-mix(in oklch, ${theme.color.surface} 74%, ${theme.color.background})`,
  color: theme.color.mutedForeground,
  cursor: "copy",
  outline: `1px solid color-mix(in oklch, ${theme.color.border} 84%, ${theme.color.surface})`,
  outlineOffset: -1,
  transition:
    "background-color 140ms ease, color 140ms ease, outline-color 140ms ease, opacity 140ms ease",
  selectors: {
    "&:hover:not(:disabled)": {
      color: theme.color.primary,
      background: theme.color.surface,
      outlineColor: `color-mix(in oklch, ${theme.color.primary} 48%, ${theme.color.border})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: -1,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.45,
    },
  },
});

export const endpointIcon = style({
  display: "grid",
  placeItems: "center",
  width: 17,
  height: 17,
  color: theme.color.mutedForeground,
  transition: "color 140ms ease",
  selectors: {
    [`${endpointCopyButton}:hover:not(:disabled) &`]: {
      color: theme.color.primary,
    },
    [`${endpointCopyButton}:focus-visible &`]: {
      color: theme.color.primary,
    },
  },
});

export const endpointIconLayer = style({
  gridArea: "1 / 1",
  display: "grid",
  placeItems: "center",
  transition: "opacity 200ms ease",
  selectors: {
    [`${endpointCopyButton}[data-copied="false"] &[data-slot="copy"]`]: {
      opacity: 1,
    },
    [`${endpointCopyButton}[data-copied="false"] &[data-slot="check"]`]: {
      opacity: 0,
    },
    [`${endpointCopyButton}[data-copied="true"] &[data-slot="copy"]`]: {
      opacity: 0,
    },
    [`${endpointCopyButton}[data-copied="true"] &[data-slot="check"]`]: {
      opacity: 1,
    },
  },
});

export const clientsSection = style({
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  minWidth: 0,
  minHeight: 0,
  borderRadius: 8,
  background: theme.color.surface,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  overflow: "hidden",
});

export const toolsSection = clientsSection;
export const callsSection = clientsSection;

export const contentGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1.5fr",
  gap: 12,
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
  "@media": {
    "(max-width: 980px)": {
      gridTemplateColumns: "1fr",
      // gridTemplateRows: "minmax(180px, 1fr) minmax(220px, 0.9fr)",
    },
  },
});

export const clientList = style({
  display: "grid",
  alignContent: "start",
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "auto",
});

export const toolList = style([
  clientList,
  {
    display: "block",
    paddingBottom: 8,
  },
]);
export const callList = clientList;

export const clientRow = style({
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  gap: 9,
  alignItems: "center",
  minHeight: 54,
  padding: "8px 10px",
  borderTop: `1px solid ${theme.color.border}`,
});

export const callRow = clientRow;

export const toolRow = style({
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  gap: 9,
  alignItems: "start",
  minHeight: 76,
  padding: "9px 10px",
  borderTop: `1px solid ${theme.color.border}`,
});

export const clientIcon = style({
  display: "grid",
  placeItems: "center",
  width: 24,
  height: 24,
  borderRadius: 7,
  background: `color-mix(in oklch, ${theme.color.success} 10%, ${theme.color.surface})`,
  color: theme.color.success,
  outline: `1px solid color-mix(in oklch, ${theme.color.success} 30%, ${theme.color.border})`,
  outlineOffset: -1,
});

export const callIcon = style({
  display: "grid",
  placeItems: "center",
  width: 24,
  height: 24,
  borderRadius: 7,
  background: `color-mix(in oklch, ${theme.color.success} 10%, ${theme.color.surface})`,
  color: theme.color.success,
  outline: `1px solid color-mix(in oklch, ${theme.color.success} 30%, ${theme.color.border})`,
  outlineOffset: -1,
});

export const toolIcon = style({
  display: "grid",
  placeItems: "center",
  width: 24,
  height: 24,
  borderRadius: 7,
  background: `color-mix(in oklch, ${theme.color.primary} 12%, ${theme.color.surface})`,
  color: theme.color.primary,
  outline: `1px solid color-mix(in oklch, ${theme.color.primary} 34%, ${theme.color.border})`,
  outlineOffset: -1,
});

export const clientMain = style({
  display: "grid",
  gap: 6,
  minWidth: 0,
});

export const callMain = clientMain;

export const toolMain = style({
  display: "grid",
  gap: 6,
  minWidth: 0,
});

export const clientTitleLine = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const callTitleLine = clientTitleLine;

export const toolTitleLine = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const clientName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.foreground,
  fontSize: "0.875rem",
  fontWeight: 650,
  lineHeight: 1.1,
});

export const callName = clientName;

export const toolName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.foreground,
  fontSize: "0.875rem",
  fontWeight: 650,
  lineHeight: 1.1,
});

export const toolTitle = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1,
});

export const clientVersion = style({
  flex: "0 0 auto",
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1,
});

export const toolDescription = style({
  minWidth: 0,
  margin: 0,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1.35,
});

export const clientMeta = style({
  display: "grid",
  gridTemplateColumns: "max-content max-content max-content",
  gap: 10,
  minWidth: 0,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1.15,
  "@media": {
    "(max-width: 900px)": {
      gridTemplateColumns: "1fr",
      gap: 4,
    },
  },
});

export const callMeta = style({
  display: "grid",
  gridTemplateColumns: "max-content max-content max-content max-content",
  gap: 10,
  minWidth: 0,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1.15,
  "@media": {
    "(max-width: 1100px)": {
      gridTemplateColumns: "max-content max-content",
      gap: "5px 10px",
    },
    "(max-width: 760px)": {
      gridTemplateColumns: "1fr",
      gap: 4,
    },
  },
});

export const toolMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  minWidth: 0,
});

export const toolBadge = style({
  display: "inline-grid",
  placeItems: "center",
  minHeight: 18,
  borderRadius: 999,
  padding: "0 7px",
  color: theme.color.mutedForeground,
  background: theme.color.blurry,
  fontSize: "0.6875rem",
  fontWeight: 650,
  lineHeight: 1,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  selectors: {
    '&[data-tone="safe"]': {
      color: theme.color.success,
      background: `color-mix(in oklch, ${theme.color.success} 9%, ${theme.color.surface})`,
      outlineColor: `color-mix(in oklch, ${theme.color.success} 30%, ${theme.color.border})`,
    },
    '&[data-tone="warning"]': {
      color: theme.color.error,
      background: `color-mix(in oklch, ${theme.color.error} 10%, ${theme.color.surface})`,
      outlineColor: `color-mix(in oklch, ${theme.color.error} 34%, ${theme.color.border})`,
    },
  },
});

export const clientMetaItem = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const callMetaItem = clientMetaItem;

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  minHeight: 120,
  height: "100%",
  minWidth: 0,
  padding: 12,
  borderTop: `1px solid ${theme.color.border}`,
  color: theme.color.mutedForeground,
  fontSize: "0.875rem",
  textAlign: "center",
});
