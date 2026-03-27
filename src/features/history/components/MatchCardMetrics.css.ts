import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css.ts";

export const metricRow = style({
  display: "grid",
  // gridTemplateColumns: "repeat(3, minmax(0, max-content))",
  gridAutoFlow: "column",
  gap: 16,
  height: 18,
  alignItems: "center",
  justifyContent: "start",
});

export const metricGroup = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 10,
  height: "100%",
});

export const metricPrimary = style({
  fontSize: "0.8rem",
  fontWeight: 600,
  color: vars.color.foreground,
  lineHeight: 1,
  whiteSpace: "nowrap",
  textAlign: "center",
});

export const metricPrimaryInline = style([
  metricPrimary,
  {
    display: "grid",
    gridAutoFlow: "column",
    placeItems: "center",
    height: "100%",
    gap: 6,
  },
]);

export const metricPrimaryText = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
});

export const metricSecondary = style({
  display: "grid",
  height: "min-content",
  alignItems: "center",
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
  whiteSpace: "nowrap",
  textAlign: "center",
  textBoxTrim: "trim-both",
});

export const scoreboardIcon = style({
  display: "block",
  width: 14,
  height: 14,
  objectFit: "fill",
  opacity: 0.92,
});

export const scoreboardIconFallback = style({
  width: 14,
  height: 14,
  borderRadius: 3,
  background: `color-mix(in oklch, ${vars.color.foreground} 22%, transparent)`,
  flexShrink: 0,
});
