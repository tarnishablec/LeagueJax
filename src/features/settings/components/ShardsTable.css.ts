import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css";

export const rowHighlight = style({
  background: vars.color.accent,
});

export const status = recipe({
  base: {
    fontSize: "0.8125rem",
    fontWeight: 500,
    textWrap: "nowrap",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  variants: {
    kind: {
      running: { color: vars.color.success },
      failed: { color: vars.color.error },
      skipped: { color: vars.color.mutedForeground },
    },
  },
});

export const idCell = style({
  cursor: "pointer",
  selectors: {
    "&:hover": {
      color: vars.color.primary,
    },
  },
});

export const depList = style({
  display: "grid",
  gap: 2,
});

export const depItem = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
  cursor: "pointer",
  textAlign: "start",
  selectors: {
    "&:hover": {
      color: vars.color.primary,
      textDecoration: "underline",
    },
  },
});
