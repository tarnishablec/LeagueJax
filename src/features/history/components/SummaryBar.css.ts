import { keyframes, style } from "@vanilla-extract/css";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

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
  minHeight: 115,
  background: theme.color.surface,
  border: `1px solid ${theme.color.border}`,
  "@media": {
    "(max-width: 1000px)": {
      gridTemplateColumns: "56px minmax(0, 1fr)",
      gridTemplateRows: "auto auto",
    },
  },
});

export const avatarSlot = style({
  position: "relative",
  width: 56,
  height: 56,
  borderRadius: 8,
  overflow: "visible",
  background: theme.color.blurry,
});

export const iconFallback = style({
  width: "100%",
  height: "100%",
  borderRadius: 8,
  overflow: "hidden",
  background: theme.color.blurry,
});

export const profileIcon = style({
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: 8,
  objectFit: "cover",
});

export const levelBadge = style({
  position: "absolute",
  right: 0,
  bottom: 0,
  transform: "translate(24%, 24%)",
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  borderRadius: 4,
  display: "inline-grid",
  placeItems: "center",
  fontSize: "0.62rem",
  fontWeight: 700,
  lineHeight: 1,
  color: "oklch(0.98 0 0 / 0.96)",
  background: theme.color.deep,
  border: `1px solid ${theme.color.blurry}`,
});

export const identity = style({
  display: "grid",
  alignContent: "center",
  gap: 3,
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
  color: theme.color.foreground,
});

export const copyButton = style({
  display: "grid",
  placeItems: "center",
  width: 18,
  height: 18,
  border: "none",
  background: "none",
  borderRadius: 4,
  color: theme.color.mutedForeground,
  cursor: "pointer",
  transition: "color 120ms, background-color 120ms",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      background: theme.color.background,
    },
  },
});

export const tag = style({
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
});

export const tagRow = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  justifyContent: "start",
  alignItems: "center",
  gap: 6,
});

export const serverBadge = style({
  display: "inline-grid",
  alignItems: "center",
  minHeight: 18,
  padding: "0 7px",
  borderRadius: 4,
  background: "oklch(0.58 0.13 215)",
  color: "white",
  fontSize: "0.6875rem",
  fontWeight: 650,
  lineHeight: 1,
});

export const privacyBadge = style({
  display: "inline-grid",
  placeItems: "center",
  gap: 4,
  fontSize: "0.6875rem",
  fontWeight: 500,
  height: 20,
  width: 20,
  padding: 0,
  border: "none",
  font: "inherit",
  color: theme.color.mutedForeground,
  background: theme.color.border,
  borderRadius: 4,
  cursor: "help",
  lineHeight: 1,
  outline: "none",
  // selectors: {
  //   "&:hover, &:focus-visible": {
  //     color: vars.color.foreground,
  //     background: vars.color.background,
  //   },
  //   "&:focus-visible": {
  //     boxShadow: `0 0 0 2px ${vars.color.primary}`,
  //   },
  // },
});

export const tooltipPositioner = style({});

export const tooltipContent = style({
  zIndex: layers.overlay.tooltip,
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  padding: "4px 8px",
  fontSize: "0.6875rem",
});

export const ranks = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  alignContent: "center",
  "@media": {
    "(max-width: 1050px)": {
      gridColumn: "1 / -1",
      gridTemplateColumns: "1fr 1fr",
    },
  },
});

export const rankCard = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  height: "88px",
  width: 180,
  gap: 10,
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.surface,
  padding: "10px 12px",
});

export const rankUnavailable = style({
  display: "grid",
  gridColumn: "1 / -1",
  alignItems: "center",
  minHeight: 88,
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.surface,
  color: theme.color.mutedForeground,
  fontSize: "0.8125rem",
  fontWeight: 600,
});

export const rankIconWrap = style({
  width: 56,
  height: 56,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
});

export const rankIcon = style({
  display: "block",
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
  color: theme.color.mutedForeground,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const rankTier = style({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: theme.color.foreground,
});

export const rankMeta = style({
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
});

export const highestRank = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  justifyContent: "start",
  gap: 4,
  minWidth: 0,
  fontSize: "0.6rem",
  lineHeight: 1,
  whiteSpace: "nowrap",
});

export const highestRankLabel = style({
  color: theme.color.mutedForeground,
});

export const highestRankIcon = style({
  display: "block",
  width: 13,
  height: 13,
  objectFit: "contain",
});

export const highestRankText = style({
  minWidth: 0,
  overflow: "hidden",
  color: theme.color.mutedForeground,
  fontWeight: 650,
  textOverflow: "ellipsis",
});
