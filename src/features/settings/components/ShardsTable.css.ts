import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { theme } from "@/styles/theme.css";

export const rowHighlight = style({
  background: theme.color.accent,
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
      running: { color: theme.color.success },
      failed: { color: theme.color.error },
      skipped: { color: theme.color.mutedForeground },
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
  color: theme.color.foreground,
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
  color: theme.color.mutedForeground,
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
      color: theme.color.foreground,
      background: theme.color.accent,
    },
  },
});

export const depList = style({
  display: "grid",
  gap: 2,
});

export const depItem = style({
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
  cursor: "pointer",
  textAlign: "start",
  selectors: {
    "&:hover": {
      color: theme.color.primary,
      textDecoration: "underline",
    },
  },
});
