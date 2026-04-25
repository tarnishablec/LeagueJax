import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css.ts";

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
  background: `color-mix(in oklch, ${vars.color.border} 60%, transparent)`,
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

export const tooltipPositioner = style({
  zIndex: 40,
});

export const tooltipContent = style({
  borderRadius: 8,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  color: vars.color.foreground,
  padding: "4px 8px",
  fontSize: "0.6875rem",
  boxShadow: `0 8px 24px oklch(from ${vars.color.foreground} 0.25 c h / 0.2)`,
  selectors: {
    ":root.dark &": {
      boxShadow: `0 8px 24px oklch(from ${vars.color.backgroundRaw} 0.06 c h / 0.6)`,
    },
  },
});
