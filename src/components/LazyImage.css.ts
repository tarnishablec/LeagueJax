import { style } from "@vanilla-extract/css";

export const lazyFadeIn = style({
  opacity: 0,
  transition: "opacity 200ms ease-in",
  selectors: {
    "&[data-loaded]": {
      opacity: 1,
    },
  },
});
