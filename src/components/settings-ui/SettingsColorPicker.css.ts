import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const srOnly = style({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

export const label = style([srOnly]);

export const control = style({
  display: "grid",
  placeItems: "center",
});

export const trigger = style({
  position: "relative",
  width: 36,
  height: 24,
  borderRadius: 6,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  background:
    "conic-gradient(oklch(0.82 0 0) 25%, oklch(0.96 0 0) 0 50%, oklch(0.82 0 0) 0 75%, oklch(0.96 0 0) 0) 0 0 / 10px 10px",
  boxShadow: `inset 0 0 0 1px ${vars.color.border}`,
  selectors: {
    "&:hover": {
      boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${vars.color.primary} 58%, ${vars.color.border})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const valueSwatch = style({
  position: "relative",
  width: "100%",
  height: "100%",
});

export const positioner = style({
  zIndex: 45,
});

export const content = style({
  boxSizing: "border-box",
  width: "18rem",
  display: "grid",
  gap: 12,
  padding: "1rem",
  borderRadius: 6,
  background: vars.color.popupBackground,
  boxShadow: `0 12px 28px color-mix(in oklch, ${vars.color.backgroundRaw} 82%, transparent)`,
});

export const area = style({
  position: "relative",
  height: 180,
  borderRadius: 5,
  overflow: "hidden",
  touchAction: "none",
});

export const areaBackground = style({
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
});

export const areaThumb = style({
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: "2px solid oklch(1 0 0)",
  boxShadow: "0 0 0 1px oklch(0 0 0 / 0.5)",
  transform: "translate(-50%, -50%)",
});

export const slidersRow = style({
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr)",
  alignItems: "stretch",
  gap: 12,
});

export const sliderStack = style({
  display: "grid",
  alignContent: "center",
  gap: 8,
  minWidth: 0,
});

export const eyeDropperTrigger = style({
  width: 40,
  height: 40,
  borderRadius: 5,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: `color-mix(in oklch, ${vars.color.primary} 58%, ${vars.color.border})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const slider = style({
  position: "relative",
  height: 14,
  display: "grid",
  alignItems: "center",
  touchAction: "none",
});

export const sliderTrack = style({
  position: "relative",
  zIndex: 1,
  height: 14,
  borderRadius: 999,
  overflow: "hidden",
  boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${vars.color.foreground} 12%, transparent)`,
});

export const sliderThumb = style({
  zIndex: 2,
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: "2px solid oklch(1 0 0)",
  background: vars.color.popupBackground,
  boxShadow: "0 0 0 1px oklch(0 0 0 / 0.42)",
  transform: "translate(-50%, -50%)",
});

export const inputsRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 8,
});

export const input = style({
  width: "100%",
  height: 30,
  MozAppearance: "textfield",
  borderRadius: 5,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  padding: "0 10px",
  fontSize: "0.875rem",
  lineHeight: 1,
  outline: "none",
  selectors: {
    "&:focus-visible": {
      borderColor: vars.color.primary,
      boxShadow: `0 0 0 1px ${vars.color.primary}`,
    },
    "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },
  },
});

export const presetsLabel = style({
  color: vars.color.foreground,
  fontSize: "0.85rem",
  fontWeight: 700,
  lineHeight: 1,
});

export const swatchGroup = style({
  display: "grid",
  gap: "0.5rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(28px, 1fr))",
  placeItems: "center",
});

export const swatchTrigger = style({
  display: "grid",
  placeItems: "center",
  width: 28,
  height: 28,
  borderRadius: 5,
  border: 0,
  background:
    "conic-gradient(oklch(0.82 0 0) 25%, oklch(0.96 0 0) 0 50%, oklch(0.82 0 0) 0 75%, oklch(0.96 0 0) 0) 0 0 / 8px 8px",
  padding: 0,
  cursor: "pointer",
  selectors: {
    "&[data-state=checked]": {
      outline: "2px solid oklch(1 0 0)",
      outlineOffset: 2,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const swatch = style({
  position: "relative",
  width: "100%",
  height: "100%",
  borderRadius: 5,
});
