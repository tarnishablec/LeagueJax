import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const card = style({
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: vars.settings.surfaceBorderRadius,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  alignContent: "start",
});

export const title = style({
  fontSize: "1rem",
  fontWeight: 600,
  color: vars.color.foreground,
  margin: "0.4rem 0",
});

export const body = style({
  display: "grid",
  gap: 12,
});
