import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

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
  border: `1px solid ${theme.color.border}`,
  borderRadius: 8,
  background: theme.color.accent,
  color: theme.color.foreground,
  font: "inherit",
  fontSize: "0.75rem",
  padding: "6px 10px",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: theme.color.primary,
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
  border: `1px solid ${theme.color.popoverBorder}`,
  borderRadius: 10,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  padding: 10,
  boxShadow: `0 10px 24px oklch(from ${theme.color.foreground} 0.25 c h / 0.2)`,
  selectors: {
    ":root.dark &": {
      boxShadow: `0 10px 24px oklch(from ${theme.color.background} 0.06 c h / 0.6)`,
    },
  },
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
  color: theme.color.mutedForeground,
});

export const debugButtons = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: 8,
  minHeight: 0,
});

export const debugEmpty = style({
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
});

export const debugButton = style({
  border: `1px solid ${theme.color.border}`,
  borderRadius: 8,
  background: theme.color.background,
  color: theme.color.foreground,
  font: "inherit",
  wordBreak: "break-word",
  fontSize: "0.75rem",
  padding: "6px 10px",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: theme.color.primary,
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
  color: theme.color.mutedForeground,
});

export const debugCopyButton = style({
  border: `1px solid ${theme.color.border}`,
  borderRadius: 8,
  background: theme.color.background,
  color: theme.color.foreground,
  font: "inherit",
  fontSize: "0.6875rem",
  padding: "4px 8px",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: theme.color.primary,
    },
  },
});

export const debugOutput = style({
  margin: 0,
  border: `1px solid ${theme.color.border}`,
  borderRadius: 8,
  background: theme.color.background,
  padding: 10,
  overflow: "auto",
  whiteSpace: "pre",
  fontSize: "0.6875rem",
  lineHeight: 1.45,
});
