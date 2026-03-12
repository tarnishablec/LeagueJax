import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { iconCol } from "@/routes/__root.css";
import { vars } from "@/styles/theme.css";

export const container = style({
  position: "relative",
});

export const trigger = recipe({
  base: {
    display: "grid",
    placeItems: "center",
    borderRadius: 6,
    height: 36,
    fontSize: "0.875rem",
    color: vars.color.mutedForeground,
    transition: "all 150ms",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textDecoration: "none",
    selectors: {
      "&:hover": {
        background: vars.color.accent,
        color: vars.color.foreground,
      },
    },
  },
  variants: {
    collapsed: {
      false: {
        gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
      },
      true: {
        gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
      },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

export const avatar = style({
  borderRadius: "50%",
  objectFit: "cover",
  justifySelf: "center",
});

export const label = recipe({
  base: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    justifySelf: "start",
    transition: "opacity 150ms",
  },
  variants: {
    collapsed: {
      false: { opacity: 1 },
      true: { opacity: 0, width: 0 },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

export const tooltip = style({
  minWidth: 240,
  padding: 8,
  borderRadius: 8,
  background: "oklch(0.2 0.015 270 / 0.95)",
  border: "1px solid oklch(0.4 0.015 270 / 0.3)",
  color: "oklch(0.985 0 0)",
  fontSize: "0.8125rem",
  zIndex: 1000,
});

export const emptyText = style({
  padding: "8px 4px",
  color: "oklch(0.6 0 0)",
  textAlign: "center",
});

export const instanceRow = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    borderRadius: 4,
    cursor: "default",
  },
  variants: {
    focused: {
      false: {
        selectors: {
          "&:hover": {
            background: "oklch(0.3 0.015 270 / 0.5)",
            cursor: "pointer",
          },
        },
      },
      true: {
        background: `oklch(from ${vars.color.primary} l c h / 0.2)`,
      },
    },
    disabled: {
      true: {
        opacity: 0.4,
        cursor: "not-allowed",
        selectors: {
          "&:hover": {
            background: "transparent",
            cursor: "not-allowed",
          },
        },
      },
    },
  },
  defaultVariants: {
    focused: false,
    disabled: false,
  },
});

export const instancePath = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 160,
});

export const instancePid = style({
  color: "oklch(0.6 0 0)",
  fontSize: "0.75rem",
  whiteSpace: "nowrap",
});

export const focusDot = style({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: vars.color.primary,
});
