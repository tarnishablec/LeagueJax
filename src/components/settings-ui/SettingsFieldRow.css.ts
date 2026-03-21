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
  lineHeight: 1,
  display: "grid",
  gridTemplateColumns: "1fr auto",
});

export const scopeBadge = style({
  color: vars.color.mutedForeground,
  display: "block",
  fontSize: "0.75rem",
  textAlign: "center",
  justifySelf: "stretch",
  alignSelf: "center",
  lineHeight: 1,
  opacity: 0,
  transition: "opacity 120ms ease",
  selectors: {
    [`${row}:hover &`]: {
      opacity: 0.65,
    },
  },
});

export const control = style({
  display: "grid",
  justifyContent: "stretch",
});
