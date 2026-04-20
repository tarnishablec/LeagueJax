import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const labelFadeDurationMs = 180;

const spin = keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

const buttonBase = style({
  position: "relative",
  height: 32,
  minWidth: 120,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: vars.settings.controlBorderRadius,
  border: "1px solid transparent",
  paddingInline: 14,
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  userSelect: "none",
  transition: "background-color 120ms ease, border-color 120ms ease, color 120ms ease",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
    "&:active": {
      opacity: 0.9,
    },
    "&:disabled": {
      opacity: 0.6,
      cursor: "wait",
    },
  },
});

export const tone = styleVariants({
  accent: [
    buttonBase,
    {
      borderColor: vars.color.primary,
      background: vars.color.primary,
      color: "oklch(0.18 0.01 60)",
      selectors: {
        "&:hover:not(:disabled)": {
          borderColor: `color-mix(in oklch, ${vars.color.primary} 92%, oklch(1 0 0))`,
          background: `color-mix(in oklch, ${vars.color.primary} 88%, oklch(1 0 0))`,
        },
      },
    },
  ],
  neutral: [
    buttonBase,
    {
      borderColor: vars.settings.controlBorder,
      background: vars.settings.controlBg,
      color: vars.settings.controlText,
      selectors: {
        "&:hover:not(:disabled)": {
          borderColor: vars.settings.controlHoverBorder,
          background: `color-mix(in oklch, ${vars.color.primary} 10%, ${vars.settings.controlBg})`,
        },
      },
    },
  ],
});

export const iconSpin = style({
  animation: `${spin} 900ms linear infinite`,
});

export const label = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  transition: `opacity ${labelFadeDurationMs}ms ease`,
});

export const labelHidden = style({
  opacity: 0,
});

export const loaderSlot = style({
  position: "absolute",
  right: 14,
  top: "50%",
  width: 14,
  height: 14,
  display: "grid",
  placeItems: "center",
  transform: "translateY(-50%)",
  pointerEvents: "none",
});

export const loaderHidden = style({
  opacity: 0,
});
