import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const text = style({
  display: "grid",
  placeItems: "center",
  color: theme.color.foreground,
  fontSize: "0.9rem",
  lineHeight: 1.35,
  wordBreak: "break-word",
  border: `1px solid ${theme.color.border}`,
  borderRadius: 8,
});
