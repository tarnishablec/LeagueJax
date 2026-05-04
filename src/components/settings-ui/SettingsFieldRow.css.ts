import { style, styleVariants } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

export const row = style({
  display: "grid",
  gridTemplateColumns: "14rem minmax(0, 1fr)",
  alignItems: "center",
  height: 32,
  gap: 12,
});

export const label = style({
  color: theme.color.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: 1,
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 4,
});

export const labelText = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

export const hintTrigger = style({
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

export const hintTriggerTone = styleVariants({
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

export const hintPositioner = style({
  pointerEvents: "none",
  minWidth: "0 !important",
  maxWidth: "min(32rem, calc(100vw - 32px))",
});

export const hintContent = style({
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

export const hintContentTone = styleVariants({
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

export const scopeBadge = style({
  color: theme.color.mutedForeground,
  display: "block",
  fontSize: "0.75rem",
  textAlign: "center",
  justifySelf: "end",
  lineHeight: 1,
  opacity: 0,
  transition: "opacity 120ms ease",
  selectors: {
    [`${row}:hover &`]: {
      opacity: 0.65,
    },
  },
});

export const control = recipe({
  base: {
    display: "grid",
    minWidth: 0,
    alignItems: "center",
  },
  variants: {
    align: {
      stretch: {
        justifyItems: "stretch",
      },
      start: {
        justifyItems: "start",
      },
      end: {
        justifyItems: "end",
      },
    },
  },
  defaultVariants: {
    align: "stretch",
  },
});
