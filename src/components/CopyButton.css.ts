import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const copyButton = style({
  display: "grid",
  placeItems: "center",
  width: 18,
  height: 18,
  border: "none",
  background: "none",
  borderRadius: 4,
  color: theme.color.mutedForeground,
  cursor: "pointer",
  transition: "color 120ms, background-color 120ms",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      background: theme.color.background,
    },
  },
});

export const iconStack = style({
  display: "grid",
  placeItems: "center",
});

export const iconLayer = style({
  gridArea: "1 / 1",
  display: "grid",
  placeItems: "center",
  transition: "opacity 200ms ease",
});
