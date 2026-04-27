import { keyframes, style } from "@vanilla-extract/css";

export { root } from "./IconActionButton.css";

const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const iconSpin = style({
  animation: `${spin} 1s linear infinite`,
});
