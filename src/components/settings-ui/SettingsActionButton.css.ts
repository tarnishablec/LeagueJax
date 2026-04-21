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
  borderRadius: 8,
  border: "1px solid transparent",
  paddingInline: 14,
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  userSelect: "none",
  transition:
    "background-color 120ms ease, border-color 120ms ease, color 120ms ease",
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
  quiet: [
    buttonBase,
    {
      borderColor: `color-mix(in oklch, ${vars.color.primary} 88%, ${vars.color.border})`,
      background: `color-mix(in oklch, ${vars.color.primary} 90%, ${vars.color.background})`,
      color: "oklch(0.18 0.01 60)",
      selectors: {
        "&:hover:not(:disabled)": {
          borderColor: `color-mix(in oklch, ${vars.color.primary} 96%, ${vars.color.border})`,
          background: `color-mix(in oklch, ${vars.color.primary} 97%, ${vars.color.background})`,
        },
      },
    },
  ],
  neutral: [
    buttonBase,
    {
      borderColor: vars.color.border,
      background: vars.color.background,
      color: vars.color.foreground,
      selectors: {
        "&:hover:not(:disabled)": {
          borderColor: `oklch(from ${vars.color.primary} l c h / 0.45)`,
          background: `color-mix(in oklch, ${vars.color.primary} 10%, ${vars.color.background})`,
        },
      },
    },
  ],
});

export const iconSpin = style({
  animation: `${spin} 900ms linear infinite`,
});

export const feedbackIconBase = style({
  gridArea: "1 / 1",
  opacity: 0,
  transform: "scale(0.88)",
  transition: "opacity 180ms ease-in-out, transform 180ms ease-in-out",
});

export const feedbackIconVisible = style({
  opacity: 1,
  transform: "scale(1)",
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
