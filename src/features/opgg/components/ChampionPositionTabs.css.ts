import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import * as tabStrip from "@/components/tab-strip/TabStrip.css";

export const root = recipe({
  base: tabStrip.list,
  variants: {
    compact: {
      true: {
        // Shared tab styles may load later; keep the compact layout independent of CSS order.
        selectors: {
          '&[data-scope="segment-group"]': {
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            flexWrap: "nowrap",
          },
        },
      },
      false: { flexWrap: "wrap" },
    },
  },
});
export const item = recipe({
  base: tabStrip.item,
  variants: {
    compact: {
      true: {
        selectors: {
          '&[data-scope="segment-group"]': {
            paddingInline: 2,
            fontSize: "0.6875rem",
          },
        },
      },
      false: {},
    },
  },
});
export const text = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
});
