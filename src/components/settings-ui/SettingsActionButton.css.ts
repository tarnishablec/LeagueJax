import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

const spin = keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

export const button = style({
  height: 32,
  minWidth: 120,
  display: "grid",
  gridTemplateColumns: "1fr 14px",
  alignItems: "center",
  borderRadius: 8,
  border: "none",
  background: vars.color.accent,
  color: vars.color.accentForeground,
  paddingInline: 14,
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  userSelect: "none",
  transition: "opacity 120ms ease",
  selectors: {
    "&:hover": {
      opacity: 0.8,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
    "&:active": {
      opacity: 0.65,
    },
    "&:disabled": {
      opacity: 0.6,
      cursor: "wait",
    },
  },
});

export const iconSpin = style({
  animation: `${spin} 900ms linear infinite`,
});

export const label = style({
  justifySelf: "center",
  whiteSpace: "nowrap",
});

export const loaderSlot = style({
  width: 14,
  height: 14,
  display: "grid",
  placeItems: "center",
  justifySelf: "end",
});

export const loaderHidden = style({
  opacity: 0,
});
