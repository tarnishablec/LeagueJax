import { style } from "@vanilla-extract/css";

export const fadeDurationMs = 180;

export const label = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  transition: `opacity ${fadeDurationMs}ms ease`,
});

export const hidden = style({
  opacity: 0,
});
