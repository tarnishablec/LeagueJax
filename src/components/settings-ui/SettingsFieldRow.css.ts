import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const row = style({
  display: "grid",
  gridTemplateColumns: "12rem minmax(0, 1fr)",
  alignItems: "center",
  gap: 12,
});

export const label = style({
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
});

export const control = style({
  display: "grid",
  justifyContent: "start",
});
