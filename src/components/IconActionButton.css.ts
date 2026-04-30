import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const root = style({
  width: 30,
  height: 30,
  borderRadius: 7,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.foreground,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  transition: "border-color 120ms, color 120ms, opacity 100ms",
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: `oklch(from ${vars.color.primary} l c h / 0.45)`,
      color: vars.color.primary,
    },
    "&:disabled": {
      opacity: 0.45,
      pointerEvents: "none",
    },
  },
});
