import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css.ts";

const translucentSlotAccent = `color-mix(in srgb, ${vars.color.accent} 42%, transparent)`;
const cardWinBackground = "rgba(91, 195, 82, 0.2)";
const cardLoseBackground = "rgba(255, 37, 43, 0.18)";
const cardWinHoverBackground = "rgba(91, 195, 82, 0.28)";
const cardLoseHoverBackground = "rgba(255, 37, 43, 0.25)";
const cardNeutralHoverBackground = `color-mix(in srgb, ${vars.color.surface} 88%, ${vars.color.foreground})`;
const cardWinBackgroundDark = "rgba(91, 195, 82, 0.14)";
const cardLoseBackgroundDark = "rgba(255, 37, 43, 0.13)";
const cardWinHoverBackgroundDark = "rgba(91, 195, 82, 0.2)";
const cardLoseHoverBackgroundDark = "rgba(255, 37, 43, 0.19)";
const cardWinBackgroundMicaLight = "rgba(91, 195, 82, 0.34)";
const cardLoseBackgroundMicaLight = "rgba(255, 37, 43, 0.32)";
const cardWinHoverBackgroundMicaLight = "rgba(91, 195, 82, 0.44)";
const cardLoseHoverBackgroundMicaLight = "rgba(255, 37, 43, 0.42)";
const cardWinBackgroundMica = "rgba(91, 195, 82, 0.08)";
const cardLoseBackgroundMica = "rgba(255, 37, 43, 0.075)";
const cardWinHoverBackgroundMica = "rgba(91, 195, 82, 0.12)";
const cardLoseHoverBackgroundMica = "rgba(255, 37, 43, 0.11)";

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
    border: `1px solid ${vars.color.border}`,
    background: vars.color.blurry,
    transition: "background 140ms, border-color 140ms",
    selectors: {
      "&:hover": {
        background: vars.color.surface,
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
          ":root.dark &": {
            background: cardWinBackgroundDark,
          },
          ":root.dark &:hover": {
            background: cardWinHoverBackgroundDark,
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
          ":root.dark &": {
            background: cardLoseBackgroundDark,
          },
          ":root.dark &:hover": {
            background: cardLoseHoverBackgroundDark,
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
        background: vars.color.surface,
        selectors: {
          "&:hover": {
            background: cardNeutralHoverBackground,
          },
        },
      },
      terminated: {
        background: vars.color.surface,
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
      outline: `2px solid ${vars.color.primary}`,
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
  borderLeft: `1px solid ${vars.color.border}`,
  "@media": {
    "screen and (max-width: 980px)": {
      gridColumn: "2 / -1",
      gridRow: 2,
      paddingLeft: 0,
      paddingTop: 10,
      borderLeft: "none",
      borderTop: `1px solid ${vars.color.border}`,
    },
  },
});

export const championIcon = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const championIconFallback = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
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
    border: `1px solid ${vars.color.border}`,
    whiteSpace: "nowrap",
  },
  variants: {
    outcome: {
      victory: {
        color: "oklch(0.76 0.16 142)",
        borderColor: "oklch(0.73 0.18 142 / 0.6)",
        background: "oklch(0.73 0.18 142 / 0.18)",
      },
      defeat: {
        color: "oklch(0.78 0.16 22)",
        borderColor: "oklch(0.62 0.18 20 / 0.6)",
        background: "oklch(0.62 0.18 20 / 0.16)",
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
  color: vars.color.mutedForeground,
  lineHeight: 1,
  padding: "4px 8px",
  borderRadius: 999,
  border: `1px solid ${vars.color.border}`,
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
  border: `1px solid ${vars.color.border}`,
});

export const subRuneStyleIcon = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  objectFit: "contain",
  border: `1px solid ${vars.color.border}`,
  padding: 1,
});

export const assetIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  border: `1px solid ${vars.color.border}`,
  background: translucentSlotAccent,
});

export const augmentIcon = recipe({
  base: {
    width: 22,
    height: 22,
    borderRadius: 4,
    objectFit: "cover",
    boxSizing: "border-box",
    border: `1px solid ${vars.color.border}`,
  },
  variants: {
    rarity: {
      default: {
        background: vars.color.background,
      },
      prismatic: {
        border: "1px solid transparent",
        background:
          "linear-gradient(oklch(0.3 0.04 300), oklch(0.3 0.04 300)) padding-box, linear-gradient(135deg, oklch(0.82 0.2 322), oklch(0.56 0.23 296)) border-box",
      },
      gold: {
        borderColor: "oklch(0.84 0.18 85)",
        background: "oklch(0.3 0.05 85)",
      },
      silver: {
        borderColor: "oklch(0.82 0 0)",
        background: "oklch(0.3 0 0)",
      },
      bronze: {
        borderColor: "oklch(0.55 0.12 52)",
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
    border: `1px solid ${vars.color.border}`,
    background: translucentSlotAccent,
  },
  variants: {
    rarity: {
      default: {
        background: translucentSlotAccent,
      },
      prismatic: {
        border: "1px solid transparent",
        background:
          "linear-gradient(oklch(0.3 0.04 300), oklch(0.3 0.04 300)) padding-box, linear-gradient(135deg, oklch(0.82 0.2 322), oklch(0.56 0.23 296)) border-box",
      },
      gold: {
        borderColor: "oklch(0.84 0.18 85)",
        background: "oklch(0.3 0.05 85)",
      },
      silver: {
        borderColor: "oklch(0.82 0 0)",
        background: "oklch(0.3 0 0)",
      },
      bronze: {
        borderColor: "oklch(0.55 0.12 52)",
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
  border: `1px solid ${vars.color.border}`,
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
  border: `1px solid ${vars.color.border}`,
});

export const itemIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 5,
  border: `1px solid ${vars.color.border}`,
  background: translucentSlotAccent,
});

export const detail = style({
  padding: 16,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  display: "grid",
  gap: 8,
  background: vars.color.surface,
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
  background: vars.color.accent,
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
      borderBottom: `1px solid ${vars.color.border}`,
    },
  },
});

export const teamHeader = style({
  fontSize: "0.75rem",
  fontWeight: 600,
  color: vars.color.mutedForeground,
  paddingBlock: 4,
});

export const playersPanel = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  alignContent: "start",
  paddingLeft: 10,
  borderLeft: `1px solid ${vars.color.border}`,
  "@media": {
    "screen and (max-width: 980px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      paddingLeft: 0,
      paddingTop: 10,
      borderLeft: "none",
      borderTop: `1px solid ${vars.color.border}`,
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
  background: vars.color.accent,
});

export const playerNameLabel = style({
  fontSize: "0.6875rem",
  lineHeight: 1.2,
  color: vars.color.mutedForeground,
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
  color: vars.color.foreground,
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
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
      borderRadius: 4,
    },
  },
});

export const playerHoverPositioner = style({
  zIndex: 40,
});

export const playerHoverContent = style({
  borderRadius: 8,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  color: vars.color.foreground,
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

export const augmentHoverPositioner = style({
  zIndex: 40,
});

export const augmentHoverContent = style({
  borderRadius: 8,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  color: vars.color.foreground,
  padding: "4px 6px",
  fontSize: "0.6875rem",
  maxWidth: 220,
});

export const damageBar = style({
  height: 6,
  borderRadius: 3,
  background: vars.color.primary,
});
