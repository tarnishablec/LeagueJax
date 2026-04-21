import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gap: 12,
});

export const card = style({
  display: "grid",
  gap: 10,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 10,
  background: vars.color.background,
  padding: 12,
});

export const sectionTitle = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
  textTransform: "uppercase",
});

export const commandBox = style({
  width: "100%",
  minHeight: 84,
  resize: "vertical",
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  padding: "8px 10px",
  fontSize: "0.75rem",
  fieldSizing: "content",
  fontFamily:
    'ui-monospace, "SFMono-Regular", "Cascadia Code", "Fira Code", Consolas, "Liberation Mono", Menlo, monospace',
});
