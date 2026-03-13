import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css.ts";

export const wrapper = style({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center",
});

export const input = style({
  height: 36,
  paddingInline: 12,
  borderRadius: 6,
  border: `1px solid ${vars.color.border}`,
  background: "transparent",
  color: vars.color.foreground,
  fontSize: "0.875rem",
  outline: "none",
  transition: "border-color 150ms",
  selectors: {
    "&:focus": {
      borderColor: vars.color.primary,
    },
    "&::placeholder": {
      color: vars.color.mutedForeground,
    },
  },
});

export const searchButton = style({
  height: 36,
  paddingInline: 16,
  borderRadius: 6,
  background: vars.color.primary,
  color: "oklch(1 0 0)",
  fontSize: "0.875rem",
  fontWeight: 500,
  transition: "opacity 150ms",
  selectors: {
    "&:hover": { opacity: 0.75 },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    "&:active": {
      opacity: 0.6,
    },
  },
});
