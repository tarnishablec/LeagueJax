import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const card = style({
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 10,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
});

export const title = style({
  fontSize: "0.9rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const body = style({
  display: "grid",
  gap: 12,
});
