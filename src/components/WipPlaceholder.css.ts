import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  justifyItems: "center",
  gap: 12,
  minHeight: 0,
  height: "100%",
  padding: "12px",
  paddingTop: 4,
});

export const icon = style({
  width: 88,
  height: 88,
  color: vars.color.mutedForeground,
  opacity: 0.82,
});

export const title = style({
  fontSize: "1rem",
  color: vars.color.mutedForeground,
  textAlign: "center",
  fontWeight: 700,
  letterSpacing: "0.02em",
});

export const subtitle = style({
  fontSize: "0.85rem",
  color: vars.color.mutedForeground,
  textAlign: "center",
});
