import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

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
  color: vars.color.foreground,
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
  border: `1px solid color-mix(in oklch, ${vars.color.border} 80%, transparent)`,
});

export const queueIconFallback = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  border: `1px solid color-mix(in oklch, ${vars.color.border} 80%, transparent)`,
  background: `color-mix(in oklch, ${vars.color.foreground} 12%, transparent)`,
});

export const idleText = style({
  fontSize: "0.76rem",
  color: vars.color.mutedForeground,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const separator = style({
  fontSize: "0.72rem",
  color: vars.color.mutedForeground,
});

export const controls = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 8,
});

export const filterSelect = style({
  width: 140,
  minWidth: 140,
});
