import { createVar, style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

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
  color: theme.color.mutedForeground,
  opacity: 0.82,
});

export const titleWeightVar = createVar();

export const title = style({
  fontSize: "1rem",
  color: theme.color.mutedForeground,
  textAlign: "center",
  letterSpacing: "0.02em",
  fontWeight: titleWeightVar,
});

export const subtitle = style({
  fontSize: "0.85rem",
  color: theme.color.mutedForeground,
  textAlign: "center",
});
