import { style } from "@vanilla-extract/css";

export const transparentPlaceholder = style({
  background: "transparent",
  borderColor: "transparent",
});

export const imageFrame = style({
  position: "relative",
  display: "inline-block",
  overflow: "hidden",
});

export const framedImage = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
});

export const lazyFadeIn = style({
  opacity: 0,
  transition: "opacity 200ms ease-in",
  selectors: {
    "&[data-loaded]": {
      opacity: 1,
    },
  },
});
