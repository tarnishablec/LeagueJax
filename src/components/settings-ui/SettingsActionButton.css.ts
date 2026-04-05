import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const button = style({
  height: 32,
  minWidth: 120,
  borderRadius: 8,
  border: "none",
  background: vars.color.accent,
  color: vars.color.accentForeground,
  paddingInline: 14,
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  userSelect: "none",
  transition: "opacity 120ms ease",
  selectors: {
    "&:hover": {
      opacity: 0.8,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
    "&:active": {
      opacity: 0.65,
    },
  },
});
