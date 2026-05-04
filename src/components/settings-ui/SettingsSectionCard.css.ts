import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const card = style({
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 10,
  // border: `1px solid ${vars.color.border}`,
  background: theme.color.surface,
  alignContent: "start",
});

export const title = style({
  fontSize: "1rem",
  fontWeight: 575,
  color: theme.color.foreground,
  margin: "0.25rem 0",
});

export const body = style({
  display: "grid",
  gap: 12,
});
