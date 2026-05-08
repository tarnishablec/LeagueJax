import { style, styleVariants } from "@vanilla-extract/css";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  opacity: 0.5,
  cursor: "help",
  transition: "opacity 120ms ease",
  selectors: {
    "&:hover": {
      opacity: 0.9,
    },
  },
});

export const triggerTone = styleVariants({
  info: {
    color: theme.color.mutedForeground,
  },
  warning: {
    color: `color-mix(in oklch, ${theme.color.primary} 72%, ${theme.color.mutedForeground})`,
  },
  error: {
    color: `color-mix(in oklch, ${theme.color.error} 72%, ${theme.color.mutedForeground})`,
  },
});

export const positioner = style({
  pointerEvents: "none",
  minWidth: "0 !important",
  maxWidth: "min(32rem, calc(100vw - 32px))",
});

export const content = style({
  zIndex: layers.overlay.tooltip,
  boxSizing: "border-box",
  borderRadius: 8,
  padding: "4px 8px",
  fontSize: "0.8125rem",
  lineHeight: 1.4,
  display: "block",
  width: "fit-content",
  maxWidth: "100%",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});

export const contentTone = styleVariants({
  info: {
    border: `1px solid ${theme.color.popoverBorder}`,
    background: theme.color.popupBackground,
    color: theme.color.foreground,
  },
  warning: {
    border: `1px solid color-mix(in oklch, ${theme.color.primary} 42%, ${theme.color.popoverBorder})`,
    background: `color-mix(in oklch, ${theme.color.primary} 12%, ${theme.color.popupBackground})`,
    color: `color-mix(in oklch, ${theme.color.primary} 52%, ${theme.color.foreground})`,
  },
  error: {
    border: `1px solid color-mix(in oklch, ${theme.color.error} 42%, ${theme.color.popoverBorder})`,
    background: `color-mix(in oklch, ${theme.color.error} 12%, ${theme.color.popupBackground})`,
    color: `color-mix(in oklch, ${theme.color.error} 58%, ${theme.color.foreground})`,
  },
});
