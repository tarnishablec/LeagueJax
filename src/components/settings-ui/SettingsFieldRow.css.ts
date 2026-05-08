import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { theme } from "@/styles/theme.css";

export const row = style({
  display: "grid",
  gridTemplateColumns: "15rem minmax(0, 1fr)",
  alignItems: "center",
  height: 32,
  gap: 12,
});

export const label = style({
  color: theme.color.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: 1,
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 4,
});

export const labelText = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

export const scopeBadge = style({
  color: theme.color.mutedForeground,
  display: "block",
  fontSize: "0.75rem",
  textAlign: "center",
  justifySelf: "end",
  lineHeight: 1,
  opacity: 0,
  transition: "opacity 120ms ease",
  selectors: {
    [`${row}:hover &`]: {
      opacity: 0.65,
    },
  },
});

export const control = recipe({
  base: {
    display: "grid",
    minWidth: 0,
    alignItems: "center",
  },
  variants: {
    align: {
      stretch: {
        justifyItems: "stretch",
      },
      start: {
        justifyItems: "start",
      },
      end: {
        justifyItems: "end",
      },
    },
  },
  defaultVariants: {
    align: "stretch",
  },
});
