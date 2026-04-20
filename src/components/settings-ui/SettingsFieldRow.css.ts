import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const row = style({
  display: "grid",
  gridTemplateColumns: "14rem minmax(0, 1fr)",
  alignItems: "center",
  gap: 12,
});

export const label = style({
  color: vars.color.mutedForeground,
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
    color: vars.color.mutedForeground,
  },
  warning: {
    color: `color-mix(in oklch, ${vars.color.primary} 72%, ${vars.color.mutedForeground})`,
  },
  error: {
    color: `color-mix(in oklch, ${vars.color.error} 72%, ${vars.color.mutedForeground})`,
  },
});

export const hintPositioner = style({
  zIndex: 40,
});

export const hintContent = style({
  borderRadius: vars.settings.controlBorderRadius,
  padding: "4px 8px",
  fontSize: "0.8125rem",
  lineHeight: 1.4,
  display: "inline-block",
  width: "max-content",
  maxWidth: "min(32rem, calc(100vw - 32px))",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});

export const hintContentTone = styleVariants({
  info: {
    border: `1px solid ${vars.color.popoverBorder}`,
    background: vars.color.popover,
    color: vars.color.foreground,
  },
  warning: {
    border: `1px solid color-mix(in oklch, ${vars.color.primary} 42%, ${vars.color.popoverBorder})`,
    background: `color-mix(in oklch, ${vars.color.primary} 12%, ${vars.color.popover})`,
    color: `color-mix(in oklch, ${vars.color.primary} 52%, ${vars.color.foreground})`,
  },
  error: {
    border: `1px solid color-mix(in oklch, ${vars.color.error} 42%, ${vars.color.popoverBorder})`,
    background: `color-mix(in oklch, ${vars.color.error} 12%, ${vars.color.popover})`,
    color: `color-mix(in oklch, ${vars.color.error} 58%, ${vars.color.foreground})`,
  },
});

export const scopeBadge = style({
  color: vars.color.mutedForeground,
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

export const control = style({
  display: "grid",
  justifyContent: "stretch",
});
