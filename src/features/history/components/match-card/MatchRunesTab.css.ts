import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { gameColorVars } from "@/styles/game-colors.css.ts";
import { layers } from "@/styles/layers.css.ts";
import { theme } from "@/styles/theme.css.ts";

export const sectionGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(220px, 0.72fr)",
  gap: 10,
  "@media": {
    "screen and (max-width: 980px)": {
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    },
    "screen and (max-width: 760px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const section = style({
  minWidth: 0,
  display: "grid",
  alignContent: "start",
  gap: 8,
  padding: 10,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 62%, transparent)`,
});

export const fullWidthSection = style({
  gridColumn: "1 / -1",
});

export const statSection = style({
  "@media": {
    "screen and (max-width: 980px)": {
      gridColumn: "1 / -1",
    },
    "screen and (max-width: 760px)": {
      gridColumn: "auto",
    },
  },
});

export const sectionHeader = style({
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  color: theme.color.foreground,
  fontSize: "0.8125rem",
  fontWeight: 750,
  lineHeight: 1,
});

export const augmentPanel = style({
  minWidth: 0,
  display: "grid",
  gap: 8,
});

export const augmentHeader = style({
  color: theme.color.foreground,
  fontSize: "0.8125rem",
  fontWeight: 750,
  lineHeight: 1,
});

export const styleIcon = style({
  width: 24,
  height: 24,
  borderRadius: 6,
  objectFit: "contain",
});

export const styleIconFallback = style({
  width: 24,
  height: 24,
  borderRadius: 6,
  background: theme.color.accent,
});

export const runeList = style({
  display: "grid",
  gap: 6,
});

export const runeEntry = style({
  minWidth: 0,
  width: "100%",
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  padding: 6,
  borderRadius: 8,
  outline: `1px solid transparent`,
  background: `color-mix(in srgb, ${theme.color.background} 18%, transparent)`,
  color: theme.color.foreground,
  textAlign: "left",
  cursor: "default",
  selectors: {
    "&:hover": {
      background: theme.color.accent,
      outlineColor: theme.color.border,
    },
  },
});

export const runeIcon = style({
  width: 28,
  height: 28,
  borderRadius: 999,
  objectFit: "contain",
  outline: `1px solid color-mix(in srgb, ${theme.color.border} 80%, transparent)`,
});

export const runeIconFallback = style({
  width: 28,
  height: 28,
  borderRadius: 999,
  background: theme.color.accent,
});

export const runeText = style({
  minWidth: 0,
  display: "grid",
  gap: 3,
});

export const runeName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1,
});

export const runeMeta = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  fontWeight: 600,
  lineHeight: 1,
});

export const statShardGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 6,
});

export const augmentGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
});

export const augmentEntry = recipe({
  base: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr)",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    outline: `1px solid ${theme.color.border}`,
    background: `color-mix(in srgb, ${theme.color.surface} 62%, transparent)`,
    color: theme.color.foreground,
    textAlign: "left",
    cursor: "default",
    selectors: {
      "&:hover": {
        background: theme.color.accent,
      },
    },
  },
  variants: {
    rarity: {
      default: {},
      bronze: {
        outlineColor: gameColorVars.augmentRarity.bronzeAccent,
      },
      silver: {
        outlineColor: gameColorVars.augmentRarity.silverAccent,
      },
      gold: {
        outlineColor: gameColorVars.augmentRarity.goldAccent,
      },
      prismatic: {
        outlineColor: gameColorVars.augmentRarity.prismaticAccent,
      },
    },
  },
});

export const augmentIcon = style({
  width: 32,
  height: 32,
  borderRadius: 999,
  objectFit: "contain",
});

export const augmentIconFallback = style({
  width: 32,
  height: 32,
  borderRadius: 999,
  background: theme.color.accent,
});

export const emptyState = style({
  minHeight: 72,
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

export const tooltipPositioner = style({
  pointerEvents: "none",
});

export const tooltipContent = style({
  zIndex: layers.overlay.tooltip,
  pointerEvents: "none",
  maxWidth: 320,
  display: "grid",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 8,
  outline: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  fontSize: "0.75rem",
  lineHeight: 1.35,
  boxShadow: `0 8px 24px ${theme.color.blurry}`,
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
});

export const tooltipTitle = style({
  fontSize: "0.8125rem",
  fontWeight: 750,
  lineHeight: 1.2,
});

export const tooltipDescription = style({
  color: theme.color.mutedForeground,
  whiteSpace: "pre-line",
});

export const tooltipStats = style({
  display: "grid",
  gap: 3,
  color: theme.color.foreground,
  fontSize: "0.6875rem",
  fontWeight: 650,
  whiteSpace: "pre-line",
});

export const tooltipStatLine = recipe({
  base: {
    color: "inherit",
  },
  variants: {
    rarity: {
      default: {},
      bronze: {
        color: gameColorVars.augmentRarity.bronze,
      },
      silver: {
        color: gameColorVars.augmentRarity.silver,
      },
      gold: {
        color: gameColorVars.augmentRarity.gold,
      },
      prismatic: {
        color: gameColorVars.augmentRarity.prismatic,
      },
    },
  },
});
