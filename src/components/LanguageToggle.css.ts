import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../styles/theme.css";

export const wrapper = style({
  position: "relative",
  height: "100%",
  display: "grid",
  placeItems: "center",
});

export const trigger = style({
  display: "grid",
  placeItems: "center",
  width: 36,
  height: "100%",
  color: `oklch(from ${vars.color.foreground} l c h / 0.6)`,
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
  transition: "color 100ms",
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
    },
  },
});

export const dropdownOuter = style({
  position: "absolute",
  top: "100%",
  right: 0,
  width: "max-content",
  paddingTop: 4,
  pointerEvents: "none",
  opacity: 0,
  transition: "opacity 150ms",
  zIndex: 50,
  selectors: {
    [`${wrapper}:hover &`]: {
      pointerEvents: "auto",
      opacity: 1,
    },
  },
});

export const dropdownInner = style({
  background: vars.color.popupBackgroud,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 6,
  boxShadow:
    "0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)",
  padding: 4,
  display: "grid",
  gap: 2,
  minWidth: "7rem",
});

export const dropdownItem = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr",
    alignItems: "center",
    gap: 8,
    width: "100%",
    borderRadius: 4,
    paddingInline: 8,
    paddingBlock: 6,
    fontSize: "0.75rem",
    transition: "color 100ms, background-color 100ms",
  },
  variants: {
    active: {
      true: {
        background: vars.color.accent,
        color: vars.color.accentForeground,
      },
      false: {
        color: vars.color.mutedForeground,
        selectors: {
          "&:hover": {
            background: vars.color.accent,
            color: vars.color.accentForeground,
          },
        },
      },
    },
  },
});
