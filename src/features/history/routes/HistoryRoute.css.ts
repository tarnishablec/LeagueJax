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

export const listPlaceholder = style({
  minHeight: 0,
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

export const focusPickerHeader = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
});

export const focusPickerAvatarWrap = style({
  width: 36,
  height: 36,
  borderRadius: 6,
  overflow: "hidden",
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
});

export const focusPickerAvatar = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const focusPickerAvatarFallback = style({
  width: "100%",
  height: "100%",
  background: vars.color.border,
});

export const focusPickerInfo = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const focusPickerName = style({
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const focusPickerDetail = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  justifyContent: "space-between",
  gap: 12,
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const focusPickerPath = style({
  fontSize: "0.6875rem",
  color: vars.color.mutedForeground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
