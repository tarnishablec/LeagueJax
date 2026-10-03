import { style } from "@vanilla-extract/css";

export const filters = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr)) max-content",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});
