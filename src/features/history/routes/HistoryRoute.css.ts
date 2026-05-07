import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

const pagePadding = "12px";
const pagePaddingTop = "4px";

export const page = style({
  display: "grid",
  gridTemplateRows: "minmax(115px, auto) 1fr",
  gap: 12,
  height: "100%",
  overflowX: "hidden",
  padding: pagePadding,
  paddingTop: pagePaddingTop,
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: theme.color.mutedForeground,
  fontSize: "0.875rem",
});

export const listPlaceholder = style({
  minHeight: 0,
});

export const summaryPlaceholder = style({
  minHeight: 82,
  borderRadius: 8,
  background: theme.color.surface,
  border: `1px solid ${theme.color.border}`,
});

export const focusPicker = style({
  display: "grid",
  placeContent: "center",
  gap: 12,
  height: "100%",
});

export const focusPickerTitle = style({
  fontSize: "0.875rem",
  color: theme.color.mutedForeground,
  textAlign: "center",
});

export const focusPickerCard = style({
  display: "grid",
  padding: "12px 16px",
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.accent,
  color: theme.color.foreground,
  cursor: "pointer",
  textAlign: "start",
  font: "inherit",
  fontSize: "0.8125rem",
  transition: "border-color 150ms",
  selectors: {
    "&:hover": {
      borderColor: theme.color.primary,
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
  background: theme.color.border,
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
  color: theme.color.mutedForeground,
});

export const focusPickerPath = style({
  fontSize: "0.6875rem",
  color: theme.color.mutedForeground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
