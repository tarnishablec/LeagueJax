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
  border: `1px solid ${vars.color.border}`,
  background: `oklch(from ${vars.color.backgroundRaw} 1 c h)`,
  color: vars.color.foreground,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  transition: "border-color 120ms, color 120ms",
  selectors: {
    ":root.dark &": {
      background: vars.color.background,
    },
    "&:hover:not(:disabled)": {
      borderColor: `oklch(from ${vars.color.primary} l c h / 0.45)`,
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
