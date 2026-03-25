import { createVar, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

export const iconWidthVar = createVar();
export const iconHeightVar = createVar();
export const pairMinHeightVar = createVar();

export const icon = recipe({
  base: {
    objectFit: "contain",
    display: "block",
    flexShrink: 0,
    width: iconWidthVar,
    height: iconHeightVar,
  },
  variants: {
    emphasis: {
      strong: {
        opacity: 0.96,
      },
      subtle: {
        opacity: 0.76,
      },
    },
  },
  defaultVariants: {
    emphasis: "strong",
  },
});

export const pair = style({
  display: "flex",
  alignItems: "center",
  gap: 4,
  minHeight: pairMinHeightVar,
});

export const prefGroup = style({
  display: "flex",
  alignItems: "center",
  gap: 3,
});
