import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { theme } from "@/styles/theme.css";

export const button = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    border: `1px solid ${theme.color.border}`,
    background: theme.color.surface,
    padding: "0 10px",
    cursor: "pointer",
    color: theme.color.foreground,
    selectors: {
      "&:hover": {
        borderColor: `oklch(from ${theme.color.primary} l c h / 0.45)`,
      },
      "&:focus-visible": {
        outline: `2px solid ${theme.color.primary}`,
        outlineOffset: 1,
      },
      "&[data-disabled]": {
        opacity: 0.6,
        cursor: "not-allowed",
      },
    },
  },
  variants: {
    checked: {
      true: {},
      false: {},
    },
  },
});

export const track = recipe({
  base: {
    width: 36,
    height: 20,
    borderRadius: 999,
    display: "grid",
    alignItems: "center",
    paddingInline: 2,
    transition: "background-color 120ms ease-out",
  },
  variants: {
    checked: {
      true: {
        background: `oklch(from ${theme.color.primary} l c h / 0.3)`,
        justifyItems: "end",
        selectors: {
          ":root.dark &": {
            background: `oklch(from ${theme.color.primary} l c h / 0.82)`,
          },
        },
      },
      false: {
        background: theme.color.accent,
        justifyItems: "start",
      },
    },
  },
  defaultVariants: {
    checked: false,
  },
});

export const thumb = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  background: theme.color.foreground,
});

export const text = style({
  fontSize: "0.875rem",
  color: theme.color.mutedForeground,
});
