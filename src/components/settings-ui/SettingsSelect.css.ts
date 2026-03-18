import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const select = style({
  height: 32,
  minWidth: 180,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  paddingInline: 10,
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});
