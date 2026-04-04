import { style } from "@vanilla-extract/css";

export const page = style({
  display: "grid",
  gridTemplateRows: "repeat(2, 1fr)",
  gap: 8,
  alignContent: "start",
  minHeight: 0,
  height: "100%",
  padding: "12px",
  paddingTop: 4,
});

export const rowSpacer = style({
  minHeight: 0,
});
