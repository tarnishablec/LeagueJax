import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const wrapper = style({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  paddingInline: 8,
});

export const input = style({
  width: 200,
  height: 28,
  paddingInline: 8,
  fontSize: "0.75rem",
  borderRadius: 6,
  border: `1px solid ${vars.color.border}`,
  background: "transparent",
  color: vars.color.foreground,
  outline: "none",
  selectors: {
    "&::placeholder": {
      color: vars.color.mutedForeground,
    },
    "&:focus": {
      borderColor: vars.color.primary,
    },
  },
});
