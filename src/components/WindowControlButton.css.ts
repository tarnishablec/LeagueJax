import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css";

export const trafficButton = recipe({
  base: {
    display: "grid",
    placeItems: "center",
    width: 44,
    height: "100%",
    color: `oklch(from ${vars.color.foreground} l c h / 0.7)`,
    transition: "color 100ms, background-color 100ms",
    ":active": {
      filter: "brightness(0.75)",
    },
  },
  variants: {
    variant: {
      default: {
        selectors: {
          "&:hover": {
            background: "oklch(0 0 0 / 0.162)",
            color: vars.color.foreground,
          },
          ":root.dark &:hover": {
            background: "oklch(1 0 0 / 0.2)",
          },
        },
      },
      close: {
        selectors: {
          "&:hover": {
            background: "oklch(0.47 0.2 26)",
            color: "oklch(1 0 0)",
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
