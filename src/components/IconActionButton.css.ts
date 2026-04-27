import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

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
  transition: "border-color 120ms, color 120ms, opacity 100ms",
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
      pointerEvents: "none",
    },
  },
});
