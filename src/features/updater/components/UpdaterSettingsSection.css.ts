import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  gap: 12,
});

export const summaryGrid = style({
  display: "grid",
  gap: 8,
});

export const valueText = style({
  display: "grid",
  placeItems: "center",
  minHeight: 32,
  padding: "0 10px",
  borderRadius: 8,
  color: theme.color.foreground,
  background: theme.color.blurry,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
  fontSize: "0.85rem",
  lineHeight: 1.4,
  wordBreak: "break-word",
});
