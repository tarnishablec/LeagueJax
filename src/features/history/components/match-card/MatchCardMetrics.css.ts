import { style } from "@vanilla-extract/css";
import { layers } from "@/styles/layers.css.ts";
import { theme } from "@/styles/theme.css.ts";

export const metricRow = style({
  display: "grid",
  gridAutoFlow: "column",
  gap: 16,
  alignItems: "center",
  justifyContent: "start",
});

export const divider = style({
  width: 1,
  alignSelf: "stretch",
  margin: "2px 0",
  background: `color-mix(in oklch, ${theme.color.border} 60%, transparent)`,
});

export const metricGroup = style({
  display: "grid",
  alignItems: "center",
  gap: 2,
  height: "100%",
});

export const metricPrimary = style({
  fontSize: "0.8rem",
  fontWeight: 600,
  color: theme.color.foreground,
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
    justifyContent: "center",
    gap: 3,
  },
]);

export const metricPrimaryText = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  fontSize: "1rem",
});

export const metricSecondary = style({
  display: "grid",
  height: "min-content",
  alignItems: "center",
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
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
  background: `color-mix(in oklch, ${theme.color.foreground} 22%, transparent)`,
  flexShrink: 0,
});

export const tooltipPositioner = style({});

export const tooltipContent = style({
  zIndex: layers.overlay.tooltip,
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  padding: "4px 8px",
  fontSize: "0.6875rem",
});
