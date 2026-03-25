import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 16,
  height: "100%",
  padding: "12px",
  paddingTop: 4,
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
