import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

const controlSize = 24;

export const group = style({
  position: "fixed",
  insetBlockEnd: "1rem",
  insetInlineEnd: "1rem",
  zIndex: 120,
  width: "min(22rem, calc(100vw - 1.5rem))",
  display: "grid",
  gap: 12,
  pointerEvents: "none",
});

export const root = style({
  pointerEvents: "auto",
  display: "grid",
  alignItems: "center",
  gap: 10,
  padding: "12px",
  borderRadius: 10,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.background,
  boxShadow: "0 10px 24px oklch(0 0 0 / 0.22)",
});

export const rootLayout = styleVariants({
  balanced: {
    gridTemplateColumns: `${controlSize}px minmax(0, 1fr) ${controlSize}px`,
  },
  iconOnly: {
    gridTemplateColumns: `${controlSize}px minmax(0, 1fr)`,
  },
  closeOnly: {
    gridTemplateColumns: `minmax(0, 1fr) ${controlSize}px`,
  },
  contentOnly: {
    gridTemplateColumns: "minmax(0, 1fr)",
  },
});

export const rootClickable = style({
  cursor: "pointer",
  transition: "border-color 140ms ease, background 140ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: vars.color.accent,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 2,
    },
  },
});

export const iconSlot = style({
  width: controlSize,
  height: controlSize,
  display: "grid",
  placeItems: "center",
});

export const iconTone = styleVariants({
  error: {
    color: vars.color.error,
  },
  info: {
    color: vars.color.mutedForeground,
  },
  loading: {
    color: vars.color.primary,
  },
  success: {
    color: vars.color.success,
  },
  warning: {
    color: vars.color.primary,
  },
});

const spin = keyframes({
  to: {
    transform: "rotate(360deg)",
  },
});

export const loadingIcon = style({
  animation: `${spin} 900ms linear infinite`,
});

export const body = style({
  minWidth: 0,
  display: "grid",
  gap: 6,
  justifyItems: "center",
  textAlign: "center",
});

export const title = style({
  color: vars.color.foreground,
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: 1.35,
});

export const description = style({
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});

export const actionButton = style({
  justifySelf: "center",
  marginTop: 2,
  borderRadius: 6,
  padding: "4px 8px",
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  fontSize: "0.75rem",
  lineHeight: 1,
  transition: "border-color 140ms ease, background 140ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: vars.color.accent,
    },
  },
});

export const closeButton = style({
  width: controlSize,
  height: controlSize,
  borderRadius: 6,
  display: "grid",
  placeItems: "center",
  color: vars.color.mutedForeground,
  transition:
    "background 140ms ease, color 140ms ease, border-color 140ms ease",
  selectors: {
    "&:hover": {
      background: vars.color.accent,
      color: vars.color.foreground,
    },
  },
});
