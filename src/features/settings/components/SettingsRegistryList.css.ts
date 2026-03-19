import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const card = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: 10,
  background: vars.color.background,
  overflow: "hidden",
});

export const header = style({
  display: "grid",
  gridTemplateColumns:
    "minmax(20rem, 2fr) minmax(10rem, 1fr) minmax(10rem, 1fr) 6rem",
  gap: 10,
  padding: "10px 12px",
  borderBottom: `1px solid ${vars.color.border}`,
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
});

export const row = style({
  display: "grid",
  gridTemplateColumns:
    "minmax(20rem, 2fr) minmax(10rem, 1fr) minmax(10rem, 1fr) 6rem",
  gap: 10,
  padding: "10px 12px",
  borderBottom: `1px solid ${vars.color.border}`,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
    "&:hover": {
      background: vars.color.accent,
    },
  },
});

export const key = style({
  color: vars.color.foreground,
  fontSize: "0.8125rem",
  wordBreak: "break-all",
});

export const text = style({
  color: vars.color.mutedForeground,
  fontSize: "0.8125rem",
});

export const scope = style({
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
  textTransform: "uppercase",
});
