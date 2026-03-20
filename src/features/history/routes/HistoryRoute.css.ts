import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 16,
  height: "100%",
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
});

export const focusPicker = style({
  display: "grid",
  placeContent: "center",
  gap: 12,
  height: "100%",
});

export const focusPickerTitle = style({
  fontSize: "0.875rem",
  color: vars.color.mutedForeground,
  textAlign: "center",
});

export const focusPickerCard = style({
  display: "grid",
  gap: 4,
  padding: "12px 16px",
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
  color: vars.color.foreground,
  cursor: "pointer",
  textAlign: "start",
  font: "inherit",
  fontSize: "0.8125rem",
  transition: "border-color 150ms",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
  },
});

export const focusPickerName = style({
  fontWeight: 600,
});

export const focusPickerDetail = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  justifyContent: "space-between",
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const debugDock = style({
  position: "fixed",
  right: 16,
  bottom: 16,
  display: "grid",
  gap: 8,
  justifyItems: "end",
  zIndex: 30,
});

export const debugToggle = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: 8,
  background: vars.color.accent,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.75rem",
  padding: "6px 10px",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
  },
});

export const debugPanel = style({
  width: "min(760px, calc(100vw - 32px))",
  minWidth: 320,
  minHeight: 240,
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "calc(100vh - 32px)",
  display: "grid",
  gridTemplateRows: "auto auto minmax(0, 1fr)",
  gap: 8,
  border: `1px solid ${vars.color.popoverBorder}`,
  borderRadius: 10,
  background: vars.color.popover,
  color: vars.color.foreground,
  padding: 10,
  boxShadow: `0 10px 24px ${vars.settings.selectMenuShadow}`,
  resize: "both",
  overflow: "hidden",
});

export const debugHeader = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
});

export const debugTitle = style({
  fontSize: "0.75rem",
  fontWeight: 600,
  color: vars.color.mutedForeground,
});

export const debugButtons = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: 8,
  minHeight: 0,
});

export const debugEmpty = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const debugButton = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: 8,
  background: vars.color.background,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.75rem",
  padding: "6px 10px",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
    "&:disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
});

export const debugOutputCard = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 8,
  minHeight: 0,
});

export const debugOutputHeader = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
});

export const debugOutputTitle = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const debugCopyButton = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: 8,
  background: vars.color.background,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.6875rem",
  padding: "4px 8px",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
  },
});

export const debugOutput = style({
  margin: 0,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 8,
  background: vars.color.background,
  padding: 10,
  overflow: "auto",
  whiteSpace: "pre",
  fontSize: "0.6875rem",
  lineHeight: 1.45,
});
