import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { layers } from "@/styles/layers.css.ts";
import { theme } from "@/styles/theme.css.ts";

export const root = style({
  display: "grid",
  gridTemplateColumns: "max-content minmax(0, max-content)",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

export const button = recipe({
  base: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    border: "none",
    borderRadius: 6,
    background: `color-mix(in srgb, ${theme.color.accent} 72%, transparent)`,
    color: theme.color.foreground,
    cursor: "pointer",
    transition: "background 140ms, color 140ms, opacity 140ms",
    selectors: {
      "&:hover:not(:disabled)": {
        background: `color-mix(in srgb, ${theme.color.primary} 72%, transparent)`,
      },
      "&:focus-visible": {
        outline: `2px solid ${theme.color.primary}`,
        outlineOffset: 2,
      },
      "&:disabled": {
        cursor: "not-allowed",
        opacity: 0.55,
      },
    },
  },
  variants: {
    tone: {
      default: {},
      danger: {
        color: "oklch(0.74 0.17 28)",
      },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const statusText = style({
  minWidth: 0,
  maxWidth: 120,
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  fontWeight: 650,
  lineHeight: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const matchReplaySpin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const spin = style({
  animation: `${matchReplaySpin} 900ms linear infinite`,
});

export const tooltipPositioner = style({});

export const tooltipContent = style({
  zIndex: layers.overlay.tooltip,
  maxWidth: 260,
  padding: "4px 6px",
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  fontSize: "0.6875rem",
  lineHeight: 1.25,
  boxShadow: `0 8px 24px ${theme.color.blurry}`,
});
