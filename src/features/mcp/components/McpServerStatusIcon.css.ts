import { keyframes, style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

const pulse = keyframes({
  "0%": {
    transform: "scale(0.82)",
    opacity: 0.65,
  },
  "70%": {
    transform: "scale(1.35)",
    opacity: 0,
  },
  "100%": {
    transform: "scale(1.35)",
    opacity: 0,
  },
});

export const trigger = style({
  position: "relative",
  width: 32,
  height: "100%",
  appearance: "none",
  border: 0,
  display: "grid",
  placeItems: "center",
  padding: 0,
  background: "transparent",
  color: theme.color.primary,
  cursor: "pointer",
  transition: "background-color 140ms ease, color 140ms ease",
  selectors: {
    "&:hover": {
      background: theme.color.tintHover,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: -2,
    },
  },
});

export const dot = style({
  position: "absolute",
  right: 8,
  top: "50%",
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: theme.color.primary,
  transform: "translateY(-8px)",
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      background: "inherit",
      animation: `${pulse} 1400ms ease-out infinite`,
    },
  },
});
