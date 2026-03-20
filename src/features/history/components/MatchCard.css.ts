import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css.ts";

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
    background: vars.color.background,
    transition: "background 140ms, border-color 140ms",
    selectors: {
      "&:hover": {
        background: vars.color.accent,
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
        borderLeftWidth: 3,
        borderLeftColor: "oklch(0.73 0.18 142)",
      },
      defeat: {
        borderLeftWidth: 3,
        borderLeftColor: "oklch(0.55 0.2 20)",
      },
      remake: {
        borderLeftWidth: 3,
        borderLeftColor: "oklch(0.62 0 0)",
      },
      terminated: {
        borderLeftWidth: 3,
        borderLeftColor: "oklch(0.62 0 0)",
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
  gridTemplateColumns: "48px minmax(0, 1fr)",
  alignItems: "start",
  gap: 12,
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 2,
      borderRadius: 6,
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
  gap: 8,
  minWidth: 0,
});

export const headerRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, max-content))",
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

export const metricRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, max-content))",
  gap: 12,
  alignItems: "center",
});

export const kda = style({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const meta = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
  whiteSpace: "nowrap",
});

export const loadoutRow = style({
  display: "grid",
  gridTemplateColumns: "max-content max-content 1fr",
  gap: 10,
  alignItems: "center",
  minWidth: 0,
});

export const loadoutGroup = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

export const iconRow = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
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
  background: vars.color.background,
});

export const assetIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
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
    background: vars.color.accent,
  },
  variants: {
    rarity: {
      default: {
        background: vars.color.accent,
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
  background: vars.color.accent,
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
  border: `1px solid ${vars.color.border}`,
});

export const itemIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 5,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
});

export const detail = style({
  padding: 16,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  display: "grid",
  gap: 8,
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

export const playerTeamHeader = style({
  fontSize: "0.625rem",
  lineHeight: 1,
  fontWeight: 600,
  color: vars.color.mutedForeground,
  paddingBottom: 2,
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
    "&:hover": {
      color: vars.color.primary,
    },
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
  background: vars.color.popover,
  color: vars.color.foreground,
  padding: "4px 6px",
  fontSize: "0.6875rem",
  boxShadow: `0 8px 24px ${vars.settings.selectMenuShadow}`,
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
  background: vars.color.popover,
  color: vars.color.foreground,
  padding: "4px 6px",
  fontSize: "0.6875rem",
  maxWidth: 220,
  boxShadow: `0 8px 24px ${vars.settings.selectMenuShadow}`,
});

export const damageBar = style({
  height: 6,
  borderRadius: 3,
  background: vars.color.primary,
});
