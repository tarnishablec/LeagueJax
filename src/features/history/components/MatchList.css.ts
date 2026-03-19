import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const panel = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 10,
  minHeight: 0,
});

export const toolbar = style({
  display: "grid",
  width: "100%",
  gridTemplateColumns: "repeat(3, 1fr) auto",
  gap: 8,

  "@media": {
    "(max-width: 1000px)": {
      // gridTemplateColumns: "1fr",
    },
  },
});

export const pageControls = style({
  display: "grid",
  gap: 8,
  gridTemplateColumns: "1fr minmax(60px, auto) 1fr auto",
});

export const selectWrap = style({
  display: "grid",
  gap: 4,
  minWidth: 0,
});

export const selectLabel = style({
  fontSize: "0.6875rem",
  color: vars.color.mutedForeground,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
});

export const pageButton = style({
  width: 30,
  height: 30,
  borderRadius: 7,
  border: `1px solid ${vars.settings.controlBorder}`,
  background: vars.settings.controlBg,
  color: vars.settings.controlText,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  transition: "border-color 120ms, color 120ms",
  selectors: {
    "&:hover": {
      borderColor: vars.settings.controlHoverBorder,
      color: vars.color.primary,
    },
    "&:disabled": {
      opacity: 0.45,
      cursor: "not-allowed",
    },
  },
});

export const pageIndicator = style({
  height: 30,
  borderRadius: 7,
  border: `1px solid ${vars.settings.controlBorder}`,
  background: vars.settings.controlBg,
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
  display: "grid",
  placeItems: "center",
  padding: "0 6px",
  lineHeight: 1,
});

export const refreshButton = style({
  width: 30,
  height: 30,
  borderRadius: 7,
  border: `1px solid ${vars.settings.controlBorder}`,
  background: vars.settings.controlBg,
  color: vars.settings.controlText,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  transition: "border-color 120ms, color 120ms",
  selectors: {
    "&:hover": {
      borderColor: vars.settings.controlHoverBorder,
      color: vars.color.primary,
    },
    "&:disabled": {
      opacity: 0.45,
      cursor: "not-allowed",
    },
  },
});

export const list = style({
  display: "grid",
  gap: 8,
  alignContent: "start",
  overflowY: "auto",
  minHeight: 0,
  paddingRight: 4,
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
});
