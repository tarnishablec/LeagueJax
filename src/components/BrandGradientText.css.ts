import { style, styleVariants } from "@vanilla-extract/css";

const gradient = [
  "linear-gradient(",
  "315deg, ",
  "oklch(0.6 0.24 306) 0%, ",
  "oklch(0.7 0.21 328) 38%, ",
  "oklch(0.7170 0.1748 56.31) 76%, ",
  "oklch(0.7170 0.1748 56.31) 100%",
  ")",
].join("");

export const root = style({
  display: "inline-block",
  lineHeight: 1.08,
  paddingBlockEnd: "0.08em",
  color: "oklch(0.85 0.19 102)",
  backgroundImage: gradient,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textShadow: "0 0.03em 0.12em oklch(0.6 0.24 306 / 0.14)",
});

export const variant = styleVariants({
  hero: {
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  inline: {
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
});
