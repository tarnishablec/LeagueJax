import { createVar, style, styleVariants } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { gameColorVars } from "@/styles/game-colors.css.ts";
import { theme } from "@/styles/theme.css.ts";

export const meterFillWidthVar = createVar();
export const physicalSegmentWidthVar = createVar();
export const magicSegmentWidthVar = createVar();
export const trueSegmentWidthVar = createVar();

const positionColumn = "34px";
const summonerColumn = "minmax(190px, 220px)";
const spellsColumn = "minmax(52px, 52px)";
const runesColumn = "minmax(152px, 152px)";
const itemsColumn = "minmax(178px, 178px)";
const questColumn = "minmax(32px, 32px)";
const damageColumn = "minmax(144px, 144px)";
const scoreColumns = "repeat(4, minmax(58px, 58px))";
const tableColumns = `${positionColumn} ${summonerColumn} ${spellsColumn} ${runesColumn} ${itemsColumn} ${questColumn} ${damageColumn} ${damageColumn} ${scoreColumns}`;
const tableColumnsWithoutPosition = `${summonerColumn} ${spellsColumn} ${runesColumn} ${itemsColumn} ${questColumn} ${damageColumn} ${damageColumn} ${scoreColumns}`;
const tableColumnsWithoutQuest = `${positionColumn} ${summonerColumn} ${spellsColumn} ${runesColumn} ${itemsColumn} ${damageColumn} ${damageColumn} ${scoreColumns}`;
const tableColumnsWithoutPositionAndQuest = `${summonerColumn} ${spellsColumn} ${runesColumn} ${itemsColumn} ${damageColumn} ${damageColumn} ${scoreColumns}`;

export const root = style({
  display: "grid",
  gap: 10,
});

export const teamBlock = recipe({
  base: {
    minWidth: 0,
    display: "grid",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    outline: `1px solid ${theme.color.border}`,
    background: `color-mix(in srgb, ${theme.color.background} 16%, transparent)`,
  },
  variants: {
    team: {
      blue: {
        outline: `1px solid ${gameColorVars.team.blueAccent}`,
      },
      red: {
        outline: `1px solid ${gameColorVars.team.redAccent}`,
      },
    },
  },
});

export const teamHeader = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  alignItems: "center",
  gap: 12,
  "@media": {
    "screen and (max-width: 760px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const teamTitleGroup = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "max-content max-content max-content",
  alignItems: "center",
  gap: 10,
});

export const teamTitle = recipe({
  base: {
    fontSize: "0.8125rem",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  variants: {
    team: {
      blue: {
        color: gameColorVars.team.blue,
      },
      red: {
        color: gameColorVars.team.red,
      },
    },
  },
});

export const teamHeaderMetric = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 4,
  color: theme.color.foreground,
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1,
});

export const scoreboardIcon = style({
  width: 16,
  height: 16,
  objectFit: "contain",
  opacity: 0.82,
});

export const scoreboardIconFallback = style({
  width: 16,
  height: 16,
  borderRadius: 4,
  background: theme.color.accent,
});

export const objectiveScroller = style({
  minWidth: 0,
  maxWidth: "100%",
  justifySelf: "end",
  "@media": {
    "screen and (max-width: 760px)": {
      justifySelf: "start",
    },
  },
});

export const objectiveList = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
});

export const objectiveStat = style({
  height: 24,
  display: "grid",
  gridTemplateColumns: "16px max-content",
  alignItems: "center",
  gap: 4,
  padding: "0 6px",
  borderRadius: 6,
  border: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 68%, transparent)`,
  color: theme.color.foreground,
  fontSize: "0.6875rem",
  fontWeight: 700,
  lineHeight: 1,
});

export const objectiveIcon = style({
  width: 16,
  height: 16,
  objectFit: "contain",
  borderRadius: 3,
});

export const objectiveIconFallback = style({
  width: 16,
  height: 16,
  borderRadius: 3,
  background: theme.color.accent,
});

export const tableScroller = style({
  minWidth: 0,
});

export const table = recipe({
  base: {
    display: "grid",
    width: "100%",
  },
  variants: {
    positionColumn: {
      shown: {
        minWidth: 1336,
      },
      hidden: {
        minWidth: 1290,
      },
    },
    questColumn: {
      shown: {},
      hidden: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        positionColumn: "shown",
        questColumn: "hidden",
      },
      style: {
        minWidth: 1292,
      },
    },
    {
      variants: {
        positionColumn: "hidden",
        questColumn: "hidden",
      },
      style: {
        minWidth: 1246,
      },
    },
  ],
  defaultVariants: {
    positionColumn: "shown",
    questColumn: "shown",
  },
});

// export const tableHeader = style({
//   display: "grid",
//   gridTemplateColumns: tableColumns,
//   alignItems: "center",
//   gap: 8,
//   minHeight: 26,
//   padding: "0 8px",
//   color: vars.color.mutedForeground,
//   fontSize: "0.6875rem",
//   fontWeight: 700,
//   lineHeight: 1,
//   borderBottom: `1px solid ${vars.color.border}`,
// });

export const participantRow = recipe({
  base: {
    display: "grid",
    width: "100%",
    boxSizing: "border-box",
    alignItems: "center",
    justifyItems: "stretch",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 42,
    padding: "5px 8px",
    color: theme.color.foreground,
    fontSize: "0.75rem",
    lineHeight: 1,
    selectors: {
      "&:not(:last-child)": {
        borderBottom: `1px solid ${theme.color.border}`,
      },
      "&:hover": {
        background: `color-mix(in srgb, ${theme.color.accent} 54%, transparent)`,
      },
    },
  },
  variants: {
    positionColumn: {
      shown: {
        gridTemplateColumns: tableColumns,
      },
      hidden: {
        gridTemplateColumns: tableColumnsWithoutPosition,
      },
    },
    questColumn: {
      shown: {},
      hidden: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        positionColumn: "shown",
        questColumn: "hidden",
      },
      style: {
        gridTemplateColumns: tableColumnsWithoutQuest,
      },
    },
    {
      variants: {
        positionColumn: "hidden",
        questColumn: "hidden",
      },
      style: {
        gridTemplateColumns: tableColumnsWithoutPositionAndQuest,
      },
    },
  ],
  defaultVariants: {
    positionColumn: "shown",
    questColumn: "shown",
  },
});

export const positionCell = style({
  display: "grid",
  placeItems: "center",
});

export const summonerCell = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
});

export const championIcon = style({
  width: 32,
  height: 32,
  borderRadius: 6,
  objectFit: "cover",
  border: `1px solid ${theme.color.border}`,
});

export const championIconFallback = style({
  width: 28,
  height: 28,
  borderRadius: 6,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.accent,
});

export const summonerText = style({
  minWidth: 0,
  display: "grid",
  gap: 3,
});

export const summonerName = style({
  width: "100%",
  minWidth: 0,
  border: "none",
  background: "transparent",
  color: theme.color.foreground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "left",
  fontWeight: 650,
  fontSize: "0.75rem",
  lineHeight: 1,
  padding: 0,
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

export const summonerBotName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.mutedForeground,
  fontWeight: 650,
  fontSize: "0.75rem",
  lineHeight: 1,
});

export const championName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
});

export const centeredCell = style({
  display: "grid",
  placeItems: "center",
});

export const loadoutCell = style({
  minWidth: 0,
  display: "grid",
  alignItems: "center",
});

export const emptyQuestSlot = style({
  width: 22,
  height: 22,
  borderRadius: 5,
  border: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.accent} 42%, transparent)`,
});

export const damageCell = style({
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  justifySelf: "stretch",
  gap: 4,
});

export const damageNumberRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  alignItems: "center",
  gap: 6,
  lineHeight: 1,
});

export const damageLabel = style({
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  fontWeight: 650,
  lineHeight: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const damageNumber = style({
  color: theme.color.foreground,
  fontSize: "0.6875rem",
  fontWeight: 700,
  lineHeight: 1,
  textAlign: "right",
});

export const damageMeterTrack = style({
  width: "100%",
  inlineSize: "100%",
  height: 7,
  borderRadius: 999,
  background: `color-mix(in srgb, ${theme.color.deep} 40%, transparent)`,
  overflow: "hidden",
});

export const damageMeterFill = style({
  width: meterFillWidthVar,
  minWidth: 0,
  maxWidth: "100%",
  height: "100%",
  display: "flex",
  borderRadius: 999,
  overflow: "hidden",
});

export const damageSegment = styleVariants({
  physical: {
    width: physicalSegmentWidthVar,
    background: gameColorVars.damage.physical,
  },
  magic: {
    width: magicSegmentWidthVar,
    background: gameColorVars.damage.magic,
  },
  trueDamage: {
    width: trueSegmentWidthVar,
    background: gameColorVars.damage.trueDamage,
  },
});

export const numberCell = style({
  color: theme.color.foreground,
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1,
  textAlign: "right",
});

export const mutedNumberCell = style({
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 650,
  lineHeight: 1,
  textAlign: "right",
});

export const scoreCell = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "14px max-content",
    justifySelf: "center",
    justifyContent: "end",
    alignItems: "center",
    gap: 4,
    fontSize: "0.75rem",
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  variants: {
    tone: {
      default: {
        color: theme.color.foreground,
      },
      muted: {
        color: theme.color.mutedForeground,
        fontWeight: 650,
      },
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const scoreCellIcon = style({
  width: 14,
  height: 14,
  objectFit: "contain",
  opacity: 0.78,
});

export const scoreCellIconFallback = style({
  width: 14,
  height: 14,
  borderRadius: 4,
  background: theme.color.accent,
});

export const tooltipPositioner = style({
  zIndex: 40,
});

export const tooltipContent = style({
  maxWidth: 260,
  padding: "4px 6px",
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  fontSize: "0.6875rem",
  lineHeight: 1.25,
  boxShadow: `0 8px 24px ${theme.color.blurry}`,
});
