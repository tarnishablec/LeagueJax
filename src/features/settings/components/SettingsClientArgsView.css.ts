import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gap: 12,
  gridTemplateRows: "auto 1fr",
});

export const card = style({
  display: "grid",
  gap: 10,
  border: `1px solid ${theme.color.border}`,
  borderRadius: 10,
  background: theme.color.surface,
  padding: 12,
  gridTemplateRows: "auto 1fr",
});

export const sectionTitle = style({
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
  textTransform: "uppercase",
});

export const commandBox = style({
  width: "100%",
  minHeight: 130,
  resize: "vertical",
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.surface,
  color: theme.color.foreground,
  padding: "8px 10px",
  fontSize: "0.75rem",
  fieldSizing: "content",
  fontFamily:
    'ui-monospace, "SFMono-Regular", "Cascadia Code", "Fira Code", Consolas, "Liberation Mono", Menlo, monospace',
});
