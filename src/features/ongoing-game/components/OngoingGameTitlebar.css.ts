import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  gridTemplateColumns: "auto auto",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minWidth: 0,
  height: "100%",
});

export const labels = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  paddingLeft: "1rem",
});

export const queueDesc = style({
  fontSize: "0.76rem",
  color: theme.color.foreground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: 600,
});

export const queueMeta = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const queueIcon = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  objectFit: "cover",
  outline: `1px solid color-mix(in oklch, ${theme.color.border} 80%, transparent)`,
});

export const queueIconFallback = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  outline: `1px solid color-mix(in oklch, ${theme.color.border} 80%, transparent)`,
  background: theme.color.surface,
});

export const idleText = style({
  fontSize: "0.76rem",
  color: theme.color.mutedForeground,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const separator = style({
  fontSize: "0.72rem",
  color: theme.color.mutedForeground,
});

export const controls = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 8,
  height: 30,
});

export const filterSelect = style({
  width: 140,
  minWidth: 140,
  height: 30,
});
