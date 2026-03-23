import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const keyCell = style({
  display: "grid",
  alignItems: "center",
  gridAutoFlow: "column",
  justifyContent: "space-between",
  paddingRight: "1rem",
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
    "tr[data-row]:hover &": {
      opacity: 1,
    },
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.accent,
    },
  },
});

export const scope = style({
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
  textTransform: "uppercase",
});
