import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const bar = style({
  display: "grid",
  gridTemplateColumns: "48px 1fr",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderRadius: 8,
  background: vars.color.accent,
});

export const iconFallback = style({
  width: 48,
  height: 48,
  borderRadius: "50%",
  background: vars.color.border,
});

export const profileIcon = style({
  width: 48,
  height: 48,
  borderRadius: "50%",
  objectFit: "cover",
});

export const name = style({
  fontSize: "1rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const level = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});
