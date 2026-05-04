import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { layers } from "../styles/layers.css";
import { theme } from "../styles/theme.css";

export { trigger } from "./ToolbarActionButton.css";

export const wrapper = style({
  position: "relative",
  height: "100%",
  display: "grid",
  placeItems: "center",
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
  zIndex: layers.overlay.dropdown,
  selectors: {
    [`${wrapper}:hover &`]: {
      pointerEvents: "auto",
      opacity: 1,
    },
  },
});

export const dropdownInner = style({
  background: theme.color.popupBackground,
  border: `1px solid ${theme.color.border}`,
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
    gridTemplateColumns: "1rem 1fr",
    alignItems: "center",
    gap: 8,
    width: "100%",
    borderRadius: 4,
    paddingInline: 8,
    paddingBlock: 6,
    fontSize: "0.75rem",
    transition: "color 100ms, background-color 100ms, outline-color 100ms",
  },
  variants: {
    active: {
      true: {
        background: `color-mix(in oklch, ${theme.color.primary} 18%, ${theme.color.background})`,
        color: theme.color.foreground,
        outline: `1px solid color-mix(in oklch, ${theme.color.primary} 55%, transparent)`,
        selectors: {
          ":root.dark &": {
            background: theme.color.accent,
            color: theme.color.accentForeground,
            outlineColor: "transparent",
          },
        },
      },
      false: {
        color: theme.color.mutedForeground,
        selectors: {
          "&:hover": {
            background: `color-mix(in oklch, ${theme.color.primary} 12%, ${theme.color.background})`,
            color: theme.color.foreground,
          },
          ":root.dark &:hover": {
            background: theme.color.accent,
            color: theme.color.accentForeground,
          },
        },
      },
    },
  },
});
