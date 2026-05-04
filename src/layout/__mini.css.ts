import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const shell = style({
  display: "grid",
  gridTemplateRows: "36px 1fr",
  height: "100vh",
  background: "transparent",
  color: theme.color.foreground,
  overflow: "hidden",
});

export const content = style({
  overflow: "hidden",
});
