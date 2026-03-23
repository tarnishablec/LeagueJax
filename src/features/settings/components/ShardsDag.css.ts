import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

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
  border: `1px solid ${vars.color.border}`,
  borderRadius: 6,
  background: vars.color.background,
  color: vars.color.mutedForeground,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
      borderColor: vars.color.primary,
    },
  },
});
