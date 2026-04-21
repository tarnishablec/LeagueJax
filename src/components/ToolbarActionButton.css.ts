import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const trigger = style({
  display: "grid",
  placeItems: "center",
  width: 32,
  height: "100%",
  color: `oklch(from ${vars.color.foreground} l c h / 0.6)`,
  transition: "color 100ms",
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
    },
  },
});
