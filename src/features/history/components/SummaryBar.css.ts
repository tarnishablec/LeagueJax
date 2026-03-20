import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const bar = style({
  display: "grid",
  gridTemplateColumns: "56px minmax(12rem, 1fr) minmax(220px, 2fr)",
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

export const levelBadge = style({
  position: "absolute",
  right: -1,
  bottom: -4,
  background: vars.color.background,
  minWidth: 30,
  height: 20,
  paddingInline: 6,
  display: "grid",
  placeItems: "center",
  color: vars.color.foreground,
  fontSize: "0.6875rem",
  fontWeight: 400,
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
  borderRadius: 4,
  color: vars.color.mutedForeground,
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

export const ranks = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  alignContent: "center",
  "@media": {
    "(max-width: 1000px)": {
      gridColumn: "1 / -1",
      // gridTemplateColumns: "1fr",
    },
  },
});

export const rankCard = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  padding: "10px 12px",
});

export const rankTop = style({
  display: "none",
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
