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

export const copyCell = style({
  display: "grid",
  alignItems: "center",
  gridTemplateColumns: "1fr 20px",
  paddingRight: "1rem",
  gap: 8,
});

export const copyText = style({
  color: vars.color.foreground,
  overflow: "hidden",
  textWrap: "nowrap",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

export const copyButton = style({
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  width: 18,
  height: 18,
  border: "none",
  background: "none",
  color: vars.color.mutedForeground,
  cursor: "pointer",
  borderRadius: 4,
  opacity: 0,
  selectors: {
    [`${copyCell}:hover &`]: {
      opacity: 1,
    },
    [`${copyCell}:focus-within &`]: {
      opacity: 1,
    },
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.accent,
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
