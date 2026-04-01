import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const root = style({
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
    "&:hover:not(:disabled)": {
      borderColor: vars.settings.controlHoverBorder,
      color: vars.color.primary,
    },
    "&:disabled": {
      opacity: 0.45,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
  },
});

export const iconSpin = style({
  animation: `${spin} 1s linear infinite`,
});
