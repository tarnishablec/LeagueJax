import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const text = style({
  minHeight: 32,
  display: "grid",
  placeItems: "center",
  color: vars.color.foreground,
  fontSize: "0.9rem",
  lineHeight: 1.35,
  wordBreak: "break-word",
  border: `1px solid ${vars.color.border}`,
  borderRadius: 8,
});
