import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const keyCell = style({
  display: "grid",
  alignItems: "center",
  gridTemplateColumns: "1fr 20px",
  paddingRight: "1rem",
  gap: 8,
});

export const keyText = style({
  color: theme.color.foreground,
  textWrap: "nowrap",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
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
    "tr[data-row]:hover &": {
      opacity: 1,
    },
    "&:hover": {
      color: theme.color.foreground,
      background: theme.color.accent,
    },
  },
});

export const scope = style({
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  textTransform: "uppercase",
});
