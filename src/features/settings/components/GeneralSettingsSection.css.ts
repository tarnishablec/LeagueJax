import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const section = style({
  display: "grid",
  gap: 12,
});

export const row = style({
  display: "grid",
  gridTemplateColumns: "10rem minmax(0, 1fr)",
  alignItems: "center",
  gap: 12,
});

export const label = style({
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
});

export const control = style({
  display: "grid",
  gridAutoFlow: "column",
  justifyContent: "start",
  gap: 8,
});

export const select = style({
  height: 32,
  minWidth: 144,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  paddingInline: 10,
});
