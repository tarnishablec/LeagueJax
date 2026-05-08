import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { theme } from "@/styles/theme.css.ts";

export const sectionGrid = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(270px, 0.88fr) minmax(0, 1.12fr)",
  gap: 10,
  "@media": {
    "screen and (max-width: 820px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const section = style({
  minWidth: 0,
  display: "grid",
  alignContent: "start",
  gap: 10,
  padding: 10,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 62%, transparent)`,
});

export const sectionHeader = style({
  color: theme.color.foreground,
  fontSize: "0.8125rem",
  fontWeight: 750,
  lineHeight: 1,
});

export const skillGrid = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(38px, 38px))",
  gap: "8px 6px",
});

export const skillStep = style({
  width: 38,
  display: "grid",
  justifyItems: "center",
  gap: 4,
});

export const skillBadge = recipe({
  base: {
    position: "relative",
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 7,
    background: `color-mix(in srgb, ${theme.color.background} 18%, transparent)`,
    outline: `1px solid ${theme.color.border}`,
    color: theme.color.foreground,
  },
  variants: {
    skill: {
      Q: {
        background: `color-mix(in srgb, ${theme.color.primary} 14%, transparent)`,
        outlineColor: theme.color.primary,
      },
      W: {
        background: `color-mix(in srgb, ${theme.color.success} 14%, transparent)`,
        outlineColor: theme.color.success,
      },
      E: {
        background: `color-mix(in srgb, ${theme.color.mutedForeground} 10%, transparent)`,
        outlineColor: theme.color.mutedForeground,
      },
      R: {
        background: `color-mix(in srgb, ${theme.color.error} 14%, transparent)`,
        outlineColor: theme.color.error,
      },
    },
  },
});

export const skillKey = style({
  fontSize: "0.8125rem",
  fontWeight: 800,
  lineHeight: 1,
});

export const skillLevel = style({
  position: "absolute",
  right: -4,
  bottom: -4,
  minWidth: 14,
  height: 14,
  display: "grid",
  placeItems: "center",
  borderRadius: 4,
  padding: "0 3px",
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  outline: `1px solid ${theme.color.border}`,
  fontSize: "0.5625rem",
  fontWeight: 800,
  lineHeight: 1,
});

export const itemGrid = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(38px, 38px))",
  gap: "8px 6px",
});

export const itemStep = style({
  width: 38,
  display: "grid",
  justifyItems: "center",
  gap: 4,
});

export const itemIcon = style({
  width: 30,
  height: 30,
  borderRadius: 6,
  objectFit: "cover",
  outline: `1px solid color-mix(in srgb, ${theme.color.border} 80%, transparent)`,
});

export const itemIconFallback = style({
  width: 30,
  height: 30,
  borderRadius: 6,
  background: theme.color.accent,
});

export const stepTime = style({
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.mutedForeground,
  fontSize: "0.625rem",
  fontWeight: 650,
  lineHeight: 1,
});

export const inlineEmpty = style({
  minHeight: 48,
  display: "grid",
  placeItems: "center",
  padding: 10,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.background} 16%, transparent)`,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 650,
});

export const emptyState = style({
  minHeight: 92,
  display: "grid",
  placeItems: "center",
  padding: 12,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 54%, transparent)`,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 650,
});
