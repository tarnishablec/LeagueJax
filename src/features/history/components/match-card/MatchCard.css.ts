import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { gameColorVars } from "@/styles/game-colors.css.ts";
import { layers } from "@/styles/layers.css.ts";
import { theme } from "@/styles/theme.css.ts";

const translucentSlotAccent = `color-mix(in srgb, ${theme.color.accent} 42%, transparent)`;
const cardWinBackground = gameColorVars.outcome.winSurface;
const cardLoseBackground = gameColorVars.outcome.loseSurface;
const cardWinHoverBackground = gameColorVars.outcome.winSurfaceHover;
const cardLoseHoverBackground = gameColorVars.outcome.loseSurfaceHover;
const cardNeutralHoverBackground = `color-mix(in srgb, ${theme.color.surface} 88%, ${theme.color.foreground})`;
const cardWinBackgroundMicaLight = `color-mix(in srgb, ${gameColorVars.outcome.winSurface} 42%, ${gameColorVars.outcome.win})`;
const cardLoseBackgroundMicaLight = `color-mix(in srgb, ${gameColorVars.outcome.loseSurface} 42%, ${gameColorVars.outcome.lose})`;
const cardWinHoverBackgroundMicaLight = `color-mix(in srgb, ${gameColorVars.outcome.winSurfaceHover} 42%, ${gameColorVars.outcome.win})`;
const cardLoseHoverBackgroundMicaLight = `color-mix(in srgb, ${gameColorVars.outcome.loseSurfaceHover} 42%, ${gameColorVars.outcome.lose})`;
const cardWinBackgroundMica = `color-mix(in srgb, ${gameColorVars.outcome.winSurface} 58%, transparent)`;
const cardLoseBackgroundMica = `color-mix(in srgb, ${gameColorVars.outcome.loseSurface} 58%, transparent)`;
const cardWinHoverBackgroundMica = `color-mix(in srgb, ${gameColorVars.outcome.winSurfaceHover} 60%, transparent)`;
const cardLoseHoverBackgroundMica = `color-mix(in srgb, ${gameColorVars.outcome.loseSurfaceHover} 60%, transparent)`;

export const wrapper = style({
  display: "grid",
  gap: 8,
});

export const card = recipe({
  base: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 220px",
    alignItems: "start",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    border: `1px solid ${theme.color.border}`,
    background: theme.color.blurry,
    transition: "background 140ms, border-color 140ms",
    selectors: {
      "&:hover": {
        background: theme.color.surface,
      },
    },
    "@media": {
      "screen and (max-width: 980px)": {
        gridTemplateColumns: "1fr",
      },
    },
  },
  variants: {
    outcome: {
      victory: {
        background: cardWinBackground,
        selectors: {
          "&:hover": {
            background: cardWinHoverBackground,
          },
          ':root:not(.dark)[data-window-effect="mica"] &': {
            background: cardWinBackgroundMicaLight,
          },
          ':root:not(.dark)[data-window-effect="mica"] &:hover': {
            background: cardWinHoverBackgroundMicaLight,
          },
          ':root.dark[data-window-effect="mica"] &': {
            background: cardWinBackgroundMica,
          },
          ':root.dark[data-window-effect="mica"] &:hover': {
            background: cardWinHoverBackgroundMica,
          },
        },
      },
      defeat: {
        background: cardLoseBackground,
        selectors: {
          "&:hover": {
            background: cardLoseHoverBackground,
          },
          ':root:not(.dark)[data-window-effect="mica"] &': {
            background: cardLoseBackgroundMicaLight,
          },
          ':root:not(.dark)[data-window-effect="mica"] &:hover': {
            background: cardLoseHoverBackgroundMicaLight,
          },
          ':root.dark[data-window-effect="mica"] &': {
            background: cardLoseBackgroundMica,
          },
          ':root.dark[data-window-effect="mica"] &:hover': {
            background: cardLoseHoverBackgroundMica,
          },
        },
      },
      remake: {
        background: theme.color.surface,
        selectors: {
          "&:hover": {
            background: cardNeutralHoverBackground,
          },
        },
      },
      terminated: {
        background: theme.color.surface,
        selectors: {
          "&:hover": {
            background: cardNeutralHoverBackground,
          },
        },
      },
    },
  },
});

export const cardMainButton = style({
  width: "100%",
  minWidth: 0,
  border: "none",
  padding: 0,
  background: "transparent",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "max-content 2fr 1fr",
  alignItems: "start",
  gap: 12,
  cursor: "pointer",
  height: "100%",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
      borderRadius: 6,
    },
  },
  "@media": {
    "screen and (max-width: 980px)": {
      gridTemplateColumns: "max-content 2fr",
      gridTemplateRows: "max-content max-content",
    },
  },
});

export const pillsSlot = style({
  paddingLeft: 10,
  borderLeft: `1px solid ${theme.color.border}`,
  "@media": {
    "screen and (max-width: 980px)": {
      gridColumn: "2 / -1",
      gridRow: 2,
      paddingLeft: 0,
      paddingTop: 10,
      borderLeft: "none",
      borderTop: `1px solid ${theme.color.border}`,
    },
  },
});

export const championIcon = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  objectFit: "cover",
  border: `1px solid ${theme.color.border}`,
});

export const championIconFallback = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.accent,
});

export const info = style({
  display: "grid",
  justifyContent: "space-between",
  height: "100%",
  gap: 8,
  minWidth: 0,
});

export const headerRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
});

export const resultPill = recipe({
  base: {
    fontSize: "0.6875rem",
    fontWeight: 700,
    lineHeight: 1,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${theme.color.border}`,
    whiteSpace: "nowrap",
  },
  variants: {
    outcome: {
      victory: {
        color: gameColorVars.outcome.winForeground,
        borderColor: `color-mix(in srgb, ${gameColorVars.outcome.winForeground} 60%, transparent)`,
        background: gameColorVars.outcome.win,
      },
      defeat: {
        color: gameColorVars.outcome.loseForeground,
        borderColor: `color-mix(in srgb, ${gameColorVars.outcome.loseForeground} 60%, transparent)`,
        background: gameColorVars.outcome.lose,
      },
      remake: {
        color: "oklch(0.82 0 0)",
        borderColor: "oklch(0.7 0 0 / 0.5)",
        background: "oklch(0.68 0 0 / 0.18)",
      },
      terminated: {
        color: "oklch(0.82 0 0)",
        borderColor: "oklch(0.7 0 0 / 0.5)",
        background: "oklch(0.68 0 0 / 0.18)",
      },
    },
  },
});

export const metaPill = style({
  fontSize: "0.6875rem",
  color: theme.color.mutedForeground,
  lineHeight: 1,
  padding: "4px 8px",
  borderRadius: 999,
  border: `1px solid ${theme.color.border}`,
  whiteSpace: "nowrap",
});

export const loadoutRow = style({
  display: "flex",
  flexWrap: "wrap",
  rowGap: 6,
  gap: 10,
  alignItems: "center",
  minWidth: 0,
});

export const positionSlot = style({
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
});

export const loadoutGroup = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 4,
  minWidth: 0,
});

export const assetIcon = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  objectFit: "cover",
  // border: `1px solid ${vars.color.border}`,
});

export const subRuneStyleIcon = style({
  width: 21,
  height: 21,
  borderRadius: 4,
  objectFit: "contain",
  display: "block",
  // outline: `1px solid ${vars.color.border}`,
  boxSizing: "border-box",
});

export const assetIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  border: `1px solid ${theme.color.border}`,
  background: translucentSlotAccent,
});

export const augmentIcon = recipe({
  base: {
    width: 22,
    height: 22,
    borderRadius: 4,
    objectFit: "cover",
    boxSizing: "border-box",
    outline: `1px solid ${theme.color.border}`,
  },
  variants: {
    rarity: {
      default: {
        background: theme.color.background,
      },
      prismatic: {
        outline: "1px solid transparent",
        background:
          "linear-gradient(oklch(0.3 0.04 300), oklch(0.3 0.04 300)) padding-box, linear-gradient(135deg, oklch(0.82 0.2 322), oklch(0.56 0.23 296)) border-box",
      },
      gold: {
        outlineColor: "oklch(0.84 0.18 85)",
        background: "oklch(0.3 0.05 85)",
      },
      silver: {
        outlineColor: "oklch(0.82 0 0)",
        background: "oklch(0.3 0 0)",
      },
      bronze: {
        outlineColor: "oklch(0.55 0.12 52)",
        background: "oklch(0.3 0.03 52)",
      },
    },
  },
  defaultVariants: {
    rarity: "default",
  },
});

export const augmentIconFallback = recipe({
  base: {
    width: 22,
    height: 22,
    borderRadius: 4,
    boxSizing: "border-box",
    outline: `1px solid ${theme.color.border}`,
    background: translucentSlotAccent,
  },
  variants: {
    rarity: {
      default: {
        background: translucentSlotAccent,
      },
      prismatic: {
        outlineColor: "oklch(0.691 0.189 318.789)",
        background:
          "linear-gradient(oklch(0.3 0.04 300), oklch(0.3 0.04 300)) padding-box, linear-gradient(135deg, oklch(0.82 0.2 322), oklch(0.56 0.23 296)) border-box",
      },
      gold: {
        outlineColor: "oklch(0.84 0.18 85)",
        background: "oklch(0.3 0.05 85)",
      },
      silver: {
        outlineColor: "oklch(0.82 0 0)",
        background: "oklch(0.3 0 0)",
      },
      bronze: {
        outlineColor: "oklch(0.55 0.12 52)",
        background: "oklch(0.3 0.03 52)",
      },
    },
  },
  defaultVariants: {
    rarity: "default",
  },
});

export const augmentEmptySlot = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  border: `1px solid ${theme.color.border}`,
  background: translucentSlotAccent,
  boxSizing: "border-box",
});

export const itemsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 22px)",
  gap: 4,
  minWidth: 0,
});

export const itemIcon = style({
  width: 22,
  height: 22,
  borderRadius: 5,
  objectFit: "cover",
  display: "block",
  border: `1px solid ${theme.color.border}`,
});

export const itemIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 5,
  border: `1px solid ${theme.color.border}`,
  background: translucentSlotAccent,
});

export const detail = style({
  padding: 16,
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  display: "grid",
  gap: 8,
  background: theme.color.surface,
});

export const participantIcon = style({
  width: 24,
  height: 24,
  borderRadius: 4,
  objectFit: "cover",
});

export const participantIconFallback = style({
  width: 24,
  height: 24,
  borderRadius: 4,
  background: theme.color.accent,
});

export const participantRow = style({
  display: "grid",
  gridTemplateColumns: "24px 1fr repeat(3, 60px)",
  alignItems: "center",
  gap: 8,
  fontSize: "0.75rem",
  paddingBlock: 4,
  selectors: {
    "&:not(:last-child)": {
      borderBottom: `1px solid ${theme.color.border}`,
    },
  },
});

export const teamHeader = style({
  fontSize: "0.75rem",
  fontWeight: 600,
  color: theme.color.mutedForeground,
  paddingBlock: 4,
});

export const playersPanel = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  alignContent: "start",
  paddingLeft: 10,
  borderLeft: `1px solid ${theme.color.border}`,
  "@media": {
    "screen and (max-width: 980px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      paddingLeft: 0,
      paddingTop: 10,
      borderLeft: "none",
      borderTop: `1px solid ${theme.color.border}`,
    },
  },
});

export const playerTeamColumn = style({
  display: "grid",
  gap: 4,
  alignContent: "start",
});

export const playerRow = style({
  display: "grid",
  gridTemplateColumns: "18px minmax(0, 1fr)",
  alignItems: "center",
  gap: 4,
});

export const playerIcon = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  objectFit: "cover",
});

export const playerIconFallback = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  background: theme.color.accent,
});

export const playerNameLabel = style({
  fontSize: "0.6875rem",
  lineHeight: 1.2,
  color: theme.color.mutedForeground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
});

export const playerNameButton = style({
  width: "100%",
  minWidth: 0,
  border: "none",
  background: "transparent",
  color: theme.color.foreground,
  fontSize: "0.6875rem",
  lineHeight: 1.2,
  textAlign: "left",
  padding: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 1,
      borderRadius: 4,
    },
    "&:hover": {
      color: theme.color.primary,
    },
  },
});

export const playerHoverPositioner = style({});

export const playerHoverContent = style({
  zIndex: layers.overlay.tooltip,
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  padding: "4px 6px",
  fontSize: "0.6875rem",
});

export const augmentHoverTrigger = style({
  display: "inline-grid",
  alignItems: "center",
});

export const augmentGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(6, 22px)",
  gap: 4,
  alignItems: "center",
});

export const augmentHoverPositioner = style({});

export const augmentHoverContent = style({
  zIndex: layers.overlay.tooltip,
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  padding: "4px 6px",
  fontSize: "0.6875rem",
  maxWidth: 220,
});

export const damageBar = style({
  height: 6,
  borderRadius: 3,
  background: theme.color.primary,
});
