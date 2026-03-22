import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

export const rankCardInner = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  alignItems: "center",
  animation: `${fadeIn} 300ms ease-out`,
});

export const bar = style({
  display: "grid",
  gridTemplateColumns: "56px minmax(12rem, 1fr) auto",
  alignItems: "center",
  gap: 16,
  padding: 12,
  borderRadius: 8,
  background: vars.color.accent,
  border: `1px solid ${vars.color.border}`,
  "@media": {
    "(max-width: 1000px)": {
      gridTemplateColumns: "56px minmax(0, 1fr)",
      gridTemplateRows: "auto auto",
    },
  },
});

export const avatarSlot = style({
  width: 56,
  height: 56,
  borderRadius: 8,
  overflow: "hidden",
  background: vars.color.border,
  position: "relative",
});

export const iconFallback = style({
  width: "100%",
  height: "100%",
});

export const profileIcon = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const identity = style({
  display: "grid",
  alignContent: "center",
  gap: 2,
});

export const nameRow = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  justifyContent: "start",
  alignItems: "center",
  gap: 6,
});

export const name = style({
  fontSize: "1rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const copyButton = style({
  display: "grid",
  placeItems: "center",
  width: 18,
  height: 18,
  border: "none",
  background: "none",
  borderRadius: 4,
  color: vars.color.mutedForeground,
  cursor: "pointer",
  transition: "color 120ms, background-color 120ms",
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.background,
    },
  },
});

export const tag = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const privacyBadge = style({
  display: "inline-grid",
  placeItems: "center",
  gap: 4,
  fontSize: "0.6875rem",
  fontWeight: 500,
  height: 20,
  width: 20,
  color: vars.color.mutedForeground,
  background: vars.color.border,
  borderRadius: 4,
  lineHeight: 1,
});

export const ranks = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  alignContent: "center",
  "@media": {
    "(max-width: 1000px)": {
      gridColumn: "1 / -1",
      gridTemplateColumns: "1fr",
    },
  },
});

export const rankCard = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  height: "80px",
  gap: 10,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  padding: "10px 12px",
});

export const rankIconWrap = style({
  width: 56,
  height: 56,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
});

export const rankIcon = style({
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

export const rankContent = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const rankQueue = style({
  fontSize: "0.6875rem",
  color: vars.color.mutedForeground,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const rankTier = style({
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const rankMeta = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});
