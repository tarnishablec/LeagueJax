import { createVar, style } from "@vanilla-extract/css";

export const controlWidth = createVar();
export const controlHeight = createVar();

export const controlRoot = style({
  boxSizing: "border-box",
  minWidth: 0,
  width: controlWidth,
  height: controlHeight,
});
