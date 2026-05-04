import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const container = style({
  width: "100%",
  height: "100%",
  minHeight: 400,
  position: "relative",
});

export const fitButton = style({
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 10,
  display: "grid",
  placeItems: "center",
  width: 28,
  height: 28,
  border: `1px solid ${theme.color.border}`,
  borderRadius: 6,
  background: theme.color.background,
  color: theme.color.mutedForeground,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      borderColor: theme.color.primary,
    },
  },
});
