import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../styles/theme.css";

export const header = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, auto) minmax(3rem, 1fr) auto auto auto",
  height: 40,
  userSelect: "none",
  borderBottom: `1px solid ${vars.color.border}`,
  background: "transparent",
  flexShrink: 0,
});

export const dragRegion = style({
  height: "100%",
});

export const centerSlots = style({
  display: "grid",
  gridAutoColumns: "max-content",
  gridAutoFlow: "column",
  alignItems: "end",
  maxWidth: "min(52vw, 720px)",
  overflow: "hidden",
  paddingInline: 8,
});

export const toolbar = style({
  display: "grid",
  gridAutoColumns: "auto",
  gridAutoFlow: "column",
  alignItems: "center",
  paddingInlineStart: 4,
});

export const divider = style({
  alignSelf: "center",
  height: 16,
  width: 1,
  background: vars.color.border,
  marginInline: 4,
});

export const windowControls = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
});

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
