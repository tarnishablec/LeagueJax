import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const root = style({
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
  background: theme.color.primary,
  selectors: {
    "[data-collapsed='true'] &": {
      width: 8,
      height: 8,
      background: theme.color.error,
    },
  },
});
