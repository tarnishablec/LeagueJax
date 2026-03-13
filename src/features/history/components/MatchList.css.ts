import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const list = style({
  display: "grid",
  gap: 8,
  alignContent: "start",
  overflowY: "auto",
  paddingRight: 4,
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
});
