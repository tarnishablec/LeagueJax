import { createVar, style, styleVariants } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css.ts";

export const meterFillWidthVar = createVar();
export const physicalSegmentWidthVar = createVar();
export const magicSegmentWidthVar = createVar();
export const trueSegmentWidthVar = createVar();

const tableColumns = "34px minmax(auto, 200px) repeat(4, auto) 144px 144px 76px 64px 58px 58px";

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
    outline: `1px solid ${vars.color.border}`,
    background: `color-mix(in srgb, ${vars.color.background} 16%, transparent)`,
  },
  variants: {
    team: {
      blue: {
        outline: `1px solid oklch(0.68 0.13 242 / 0.7)`,
        // boxShadow: "inset 2px 0 0 oklch(0.68 0.13 242 / 0.7)",
      },
      red: {
        outline: `1px solid oklch(0.66 0.16 24 / 0.72)`,
        // boxShadow: "inset 2px 0 0 oklch(0.66 0.16 24 / 0.72)",
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
        color: "oklch(0.78 0.12 242)",
      },
      red: {
        color: "oklch(0.78 0.15 24)",
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
  color: vars.color.foreground,
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
  background: vars.color.accent,
});

export const objectiveList = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  justifyContent: "end",
  alignItems: "center",
  gap: 6,
  overflowX: "auto",
  "@media": {
    "screen and (max-width: 760px)": {
      justifyContent: "start",
    },
  },
});

export const objectiveStat = style({
  height: 24,
  display: "grid",
  gridTemplateColumns: "16px max-content",
  alignItems: "center",
  gap: 4,
  padding: "0 6px",
  borderRadius: 6,
  border: `1px solid ${vars.color.border}`,
  background: `color-mix(in srgb, ${vars.color.surface} 68%, transparent)`,
  color: vars.color.foreground,
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
  background: vars.color.accent,
});

export const tableScroller = style({
  minWidth: 0,
  overflowX: "auto",
});

export const table = style({
  minWidth: 1124,
  display: "grid",
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

export const participantRow = style({
  display: "grid",
  gridTemplateColumns: tableColumns,
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  minHeight: 42,
  padding: "5px 8px",
  color: vars.color.foreground,
  fontSize: "0.75rem",
  lineHeight: 1,
  selectors: {
    "&:not(:last-child)": {
      borderBottom: `1px solid ${vars.color.border}`,
    },
    "&:hover": {
      background: `color-mix(in srgb, ${vars.color.accent} 54%, transparent)`,
    },
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
  gap: 7,
});

export const championIcon = style({
  width: 28,
  height: 28,
  borderRadius: 6,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const championIconFallback = style({
  width: 28,
  height: 28,
  borderRadius: 6,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
});

export const summonerText = style({
  minWidth: 0,
  display: "grid",
  gap: 3,
});

export const summonerName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 650,
});

export const championName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: vars.color.mutedForeground,
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
  border: `1px solid ${vars.color.border}`,
  background: `color-mix(in srgb, ${vars.color.accent} 42%, transparent)`,
});

export const damageCell = style({
  minWidth: 0,
  display: "grid",
  gap: 4,
});

export const damageNumber = style({
  color: vars.color.foreground,
  fontSize: "0.6875rem",
  fontWeight: 700,
  lineHeight: 1,
  textAlign: "right",
});

export const damageMeterTrack = style({
  width: "100%",
  height: 7,
  borderRadius: 999,
  background: `color-mix(in srgb, ${vars.color.deep} 40%, transparent)`,
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
    background: "oklch(0.62 0.18 24)",
  },
  magic: {
    width: magicSegmentWidthVar,
    background: "oklch(0.66 0.14 244)",
  },
  trueDamage: {
    width: trueSegmentWidthVar,
    background: "oklch(0.72 0 0)",
  },
});

export const numberCell = style({
  color: vars.color.foreground,
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1,
  textAlign: "right",
});

export const mutedNumberCell = style({
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 650,
  lineHeight: 1,
  textAlign: "right",
});

export const tooltipPositioner = style({
  zIndex: 40,
});

export const tooltipContent = style({
  maxWidth: 260,
  padding: "4px 6px",
  borderRadius: 8,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  color: vars.color.foreground,
  fontSize: "0.6875rem",
  lineHeight: 1.25,
  boxShadow: `0 8px 24px ${vars.color.blurry}`,
});
