import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gap: 16,
  alignContent: "start",
});

export const title = style({
  fontSize: "1.125rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const sections = style({
  display: "grid",
  gap: 12,
});

export const section = style({
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 10,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
});

export const sectionTitle = style({
  fontSize: "0.9rem",
  fontWeight: 600,
  color: vars.color.foreground,
});
