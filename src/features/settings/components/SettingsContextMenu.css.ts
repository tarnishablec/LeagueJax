import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const scope = style({
  display: "grid",
  alignContent: "start",
  minHeight: "100%",
});

export const positioner = style({
  zIndex: 80,
});

export const content = style({
  minWidth: 190,
  outline: "none",
  borderRadius: 8,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  boxShadow: `0 4px 12px oklch(from ${vars.color.foreground} 0.26 c h / 0.2)`,
  overflow: "hidden",
  padding: 4,
  selectors: {
    ":root.dark &": {
      boxShadow: `0 4px 12px oklch(from ${vars.color.background} 0.06 c h / 0.62)`,
    },
  },
});

export const item = style({
  minHeight: 28,
  borderRadius: 5,
  padding: "0 28px 0 10px",
  display: "grid",
  alignItems: "center",
  cursor: "default",
  color: vars.color.foreground,
  fontSize: "0.8125rem",
  lineHeight: 1,
  userSelect: "none",
  selectors: {
    "&[data-highlighted]": {
      background: `oklch(from ${vars.color.accent} 0.9 c h)`,
    },
    ":root.dark &[data-highlighted]": {
      background: `oklch(from ${vars.color.accent} 0.36 c h / 0.45)`,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.color.primary}`,
      outlineOffset: -1,
    },
  },
});

export const separator = style({
  height: 1,
  margin: "4px 2px",
  background: vars.color.popoverBorder,
});
