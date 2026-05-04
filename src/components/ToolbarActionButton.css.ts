import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const trigger = style({
  display: "grid",
  placeItems: "center",
  width: 32,
  height: "100%",
  color: `oklch(from ${theme.color.foreground} l c h / 0.6)`,
  transition: "color 100ms, background-color 100ms",
  selectors: {
    "&:hover": {
      background: `color-mix(in oklch, ${theme.color.primary} 10%, transparent)`,
      color: theme.color.foreground,
    },
    ":root.dark &:hover": {
      background: theme.color.accent,
    },
  },
});
