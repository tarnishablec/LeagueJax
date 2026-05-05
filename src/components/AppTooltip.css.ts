import { style } from "@vanilla-extract/css";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

export const positioner = style({
  pointerEvents: "none",
  minWidth: "0 !important",
  maxWidth: "min(34rem, calc(100vw - 32px))",
});

export const content = style({
  zIndex: layers.overlay.tooltip,
  boxSizing: "border-box",
  display: "block",
  width: "fit-content",
  maxWidth: "100%",
  padding: "4px 8px",
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  fontSize: "0.75rem",
  lineHeight: 1.4,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  boxShadow: `0 8px 24px ${theme.color.blurry}`,
});
