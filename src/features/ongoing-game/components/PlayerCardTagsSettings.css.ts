import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  gap: 12,
});

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

export const colorLabel = style([srOnly]);

export const description = style({
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: 1.45,
});

export const list = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
  alignItems: "center",
  gap: "8px 12px",
});

export const itemRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const checkboxRoot = style({
  display: "inline-grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "center",
  justifyContent: "start",
  gap: 8,
  minHeight: 28,
  color: vars.color.foreground,
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 2,
      borderRadius: 6,
    },
  },
});

export const checkboxControl = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: "oklch(0.18 0.02 250)",
  display: "grid",
  placeItems: "center",
  transition:
    "background-color 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out",
  selectors: {
    "&[data-state=checked]": {
      background: vars.color.primary,
      borderColor: vars.color.primary,
    },
    [`${checkboxRoot}:hover &`]: {
      borderColor: `color-mix(in oklch, ${vars.color.primary} 58%, ${vars.color.border})`,
    },
  },
});

export const checkboxIndicator = style({
  display: "grid",
  placeItems: "center",
  lineHeight: 1,
});

export const checkboxLabel = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.875rem",
  lineHeight: 1,
});

export const colorControl = style({
  display: "grid",
  placeItems: "center",
});

export const colorPickerGroup = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 6,
});

export const colorTrigger = style({
  position: "relative",
  width: 20,
  height: 20,
  borderRadius: 6,
  overflow: "hidden",
  background: vars.color.background,
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

export const colorValueSwatch = style({
  position: "relative",
  width: "100%",
  height: "100%",
});

export const colorPositioner = style({
  zIndex: 45,
});

export const colorContent = style({
  boxSizing: "border-box",
  width: "18rem",
  display: "grid",
  gap: 12,
  padding: "1rem",
  borderRadius: 6,
  // border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  boxShadow: `0 12px 28px color-mix(in oklch, ${vars.color.background} 82%, transparent)`,
});

export const colorArea = style({
  position: "relative",
  height: 180,
  borderRadius: 5,
  overflow: "hidden",
  touchAction: "none",
});

export const colorAreaBackground = style({
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
});

export const colorAreaThumb = style({
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: "2px solid oklch(1 0 0)",
  boxShadow: "0 0 0 1px oklch(0 0 0 / 0.5)",
  transform: "translate(-50%, -50%)",
});

export const colorSlidersRow = style({
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr)",
  alignItems: "stretch",
  gap: 12,
});

export const colorSliderStack = style({
  display: "grid",
  alignContent: "center",
  gap: 8,
  minWidth: 0,
});

export const colorInputsRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 8,
});

export const colorInput = style({
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

export const colorSlider = style({
  position: "relative",
  height: 14,
  display: "grid",
  alignItems: "center",
  touchAction: "none",
});

export const colorSliderTrack = style({
  position: "relative",
  zIndex: 1,
  height: 14,
  borderRadius: 999,
  overflow: "hidden",
  boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${vars.color.foreground} 12%, transparent)`,
});

export const colorSliderThumb = style({
  zIndex: 2,
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: "2px solid oklch(1 0 0)",
  background: vars.color.popupBackground,
  boxShadow: "0 0 0 1px oklch(0 0 0 / 0.42)",
  transform: "translate(-50%, -50%)",
});

export const savedColorsLabel = style({
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
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 5,
  border: 0,
  background: "transparent",
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
