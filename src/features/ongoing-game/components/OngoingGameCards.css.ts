import { createVar, fallbackVar, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import {
  summonerIdGameNameColorVar,
  summonerIdTagLineColorVar,
} from "@/components/SummonerID";
import { gameColorVars } from "@/styles/game-colors.css";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

export const teamColsVar = createVar();
export const teamMinWidthVar = createVar();
export const playerCardSquadColorVar = createVar();
export const playerTagColorVar = createVar();

export const teamSection = recipe({
  base: {
    minWidth: 0,
    overflowY: "hidden",
  },
  variants: {
    layout: {
      standard: {
        height: "calc(100% + 6px)",
        marginBottom: -6,
        overflowX: "auto",
        // scrollbarGutter: "stable",
      },
      compact: {
        height: "100%",
        overflowX: "hidden",
      },
    },
  },
  defaultVariants: {
    layout: "standard",
  },
});

export const teamSectionContent = recipe({
  base: {
    height: "100%",
  },
  variants: {
    layout: {
      standard: {
        minWidth: "100%",
        width: "100%",
      },
      compact: {
        minWidth: 0,
        width: "100%",
      },
    },
  },
  defaultVariants: {
    layout: "standard",
  },
});

export const teamRow = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: `repeat(${teamColsVar}, minmax(220px, 1fr))`,
    gap: 8,
    height: "100%",
    width: "100%",
    placeItems: "center",
  },
  variants: {
    layout: {
      standard: {
        justifyContent: "space-between",
        minWidth: teamMinWidthVar,
      },
      compact: {
        justifyContent: "stretch",
        minWidth: 0,
      },
    },
  },
  defaultVariants: {
    layout: "standard",
  },
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: theme.color.mutedForeground,
  fontSize: "0.8rem",
  border: `1px dashed ${theme.color.border}`,
  borderRadius: 8,
  gridColumn: "1 / -1",
  width: "100%",
});

export const playerCard = style({
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 6,
  border: `1px solid ${fallbackVar(playerCardSquadColorVar, theme.color.border)}`,
  borderRadius: 10,
  padding: "10px 6px",
  background: theme.color.surface,
  height: "100%",
  minWidth: 0,
  overflow: "hidden",
  width: "100%",
});

export const playerHeader = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const playerIdentity = style({
  display: "grid",
  alignItems: "center",
  gridTemplateRows: "repeat(2, 1fr)",
  gap: 3,
  height: "100%",
  minWidth: 0,
});

export const playerNameRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  width: "100%",
});

export const playerNameCell = style({
  minWidth: 0,
  overflow: "hidden",
});

export const playerNameButton = style({
  display: "grid",
  maxWidth: "100%",
  minWidth: 0,
  width: "100%",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "start",
  cursor: "pointer",
  overflow: "hidden",
  selectors: {
    "&:hover": {
      vars: {
        [summonerIdGameNameColorVar]: theme.color.primary,
        [summonerIdTagLineColorVar]: `color-mix(in oklch, ${theme.color.primary} 72%, ${theme.color.mutedForeground})`,
      },
    },
  },
});

export const playerSquadBadge = style({
  display: "inline-grid",
  placeItems: "center",
  justifySelf: "end",
  minHeight: 18,
  maxWidth: "100%",
  padding: "0 5px",
  borderRadius: 4,
  border: `1px solid color-mix(in oklch, ${playerCardSquadColorVar} 42%, ${theme.color.border})`,
  color: `color-mix(in oklch, ${playerCardSquadColorVar} 78%, ${theme.color.foreground})`,
  background: `color-mix(in oklch, ${playerCardSquadColorVar} 18%, ${theme.color.surface})`,
  fontSize: "0.68rem",
  fontWeight: 750,
  lineHeight: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const playerAvatarWrap = style({
  position: "relative",
  width: 40,
  height: 40,
});

export const playerAvatarPlaceholder = style({
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: 6,
  background: `color-mix(in oklch, ${theme.color.surface} 74%, ${theme.color.background})`,
  outline: `1px solid color-mix(in oklch, ${theme.color.border} 72%, transparent)`,
  boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${theme.color.foreground} 4%, transparent)`,
});

export const championAvatar = style({
  width: "100%",
  height: "100%",
  borderRadius: 6,
  objectFit: "cover",
  border: `1px solid ${theme.color.border}`,
});

export const championAvatarFallback = style({
  width: 40,
  height: 40,
  borderRadius: 6,
  background: theme.color.surface,
});

export const playerMetaSingle = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 4,
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
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

export const playerOverview = style({
  display: "grid",
  gap: 5,
  minWidth: 0,
});

export const playerStats = style({
  fontSize: "0.78rem",
  color: theme.color.foreground,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  alignItems: "center",
  gap: 6,
  minHeight: 16,
  minWidth: 0,
  overflow: "hidden",
});

export const winRateText = recipe({
  base: {
    fontSize: "0.78rem",
    fontWeight: 750,
    lineHeight: 1,
    whiteSpace: "nowrap",
    justifySelf: "start",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  variants: {
    tone: {
      win: { color: gameColorVars.outcome.winForeground },
      lose: { color: gameColorVars.outcome.loseForeground },
      neutral: { color: theme.color.mutedForeground },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const playerTagList = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  alignContent: "start",
  gap: 4,
  minHeight: 18,
  minWidth: 0,
  overflow: "hidden",
});

export const playerTag = style({
  display: "inline-grid",
  placeItems: "center",
  minHeight: 18,
  minWidth: 0,
  maxWidth: "100%",
  padding: "0 5px",
  borderRadius: 4,
  border: `1px solid color-mix(in oklch, ${playerTagColorVar} 36%, ${theme.color.border})`,
  color: `color-mix(in oklch, ${playerTagColorVar} 72%, ${theme.color.foreground})`,
  background: `color-mix(in oklch, ${playerTagColorVar} 20%, ${theme.color.surface})`,
  fontSize: "0.68rem",
  fontWeight: 700,
  lineHeight: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const rankGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  alignItems: "center",
  columnGap: 2,
  minWidth: 0,
});

export const rankItem = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "center",
  gap: 3,
  lineHeight: 1,
  minWidth: 0,
});

export const rankQueue = style({
  color: theme.color.accentForeground,
  fontSize: "0.66rem",
  fontWeight: 750,
  lineHeight: 1,
  whiteSpace: "nowrap",
});

export const rankValue = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  justifyContent: "start",
  gap: 4,
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
});

export const rankIconTooltipTrigger = style({
  display: "inline-grid",
  placeItems: "center",
  lineHeight: 1,
});

export const rankMiniIcon = recipe({
  base: {
    width: 14,
    height: 14,
    objectFit: "contain",
  },
  variants: {
    ranked: {
      true: {
        width: 18,
        height: 18,
      },
      false: {},
    },
  },
});

export const rankTooltipPositioner = style({});

export const rankTooltipContent = style({
  zIndex: layers.overlay.tooltip,
  padding: "5px 7px",
  borderRadius: 4,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.deep,
  color: theme.color.foreground,
  fontSize: "0.72rem",
  fontWeight: 650,
  lineHeight: 1,
  boxShadow: `0 8px 18px ${theme.color.blurry}`,
  whiteSpace: "nowrap",
});

export const rankText = style({
  fontSize: "0.7rem",
  color: theme.color.foreground,
  fontWeight: 700,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const botLabel = style({
  fontSize: "0.78rem",
  fontWeight: 700,
  color: theme.color.foreground,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const historyList = style({
  display: "grid",
  gap: 4,
  justifyItems: "stretch",
  alignItems: "center",
  alignContent: "start",
});

export const historyListScroller = style({
  minHeight: 0,
  height: "100%",
  overflowX: "hidden",
  overflowY: "auto",
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
});

export const historyRow = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 6,
  fontSize: "0.74rem",
  borderRadius: 6,
  padding: "0 6px",
  height: 40,
  minWidth: 0,
  overflow: "hidden",
  selectors: {
    "&:hover": {
      cursor: "pointer",
      filter: "brightness(1.08)",
    },
  },
});

export const historySkeletonRow = style({
  display: "block",
  height: 40,
  lineHeight: 0,
});

export const historyRowButtonReset = style({
  width: "100%",
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
});

export const historyDialogBackdrop = style({
  position: "fixed",
  inset: 0,
  background: theme.color.blurry,
  zIndex: layers.overlay.dialogBackdrop,
  selectors: {
    "&[hidden]": { display: "none" },
  },
});

export const historyDialogPositioner = style({
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 20,
  zIndex: layers.overlay.dialog,
  selectors: {
    "&[hidden]": { display: "none" },
  },
});

export const historyDialogContent = style({
  width: "min(900px, calc(100vw - 40px))",
  maxHeight: "calc(100vh - 40px)",
  overflow: "hidden",
  borderRadius: 12,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.background,
  color: theme.color.foreground,
  padding: 0,
  display: "grid",
});

export const historyDialogScroller = style({
  maxHeight: "calc(100vh - 40px)",
  overflowX: "hidden",
  overflowY: "auto",
  scrollbarGutter: "stable",
});

export const historyDialogScrollerContent = style({
  padding: 14,
});

export const winRow = style({
  background: `color-mix(in srgb, ${gameColorVars.outcome.winSurface} 42%, ${theme.color.surface})`,
});

export const loseRow = style({
  background: `color-mix(in srgb, ${gameColorVars.outcome.loseSurface} 42%, ${theme.color.surface})`,
});

export const remakeRow = style({
  background: theme.color.surface,
});

export const terminatedRow = style({
  background: theme.color.surface,
});

export const historyEmpty = style({
  color: theme.color.mutedForeground,
  height: "100%",
  fontSize: "0.72rem",
  textAlign: "center",
});

export const historyCenteredState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: theme.color.mutedForeground,
  fontSize: "0.72rem",
  textAlign: "center",
});

export const winText = style({
  color: gameColorVars.outcome.winForeground,
  fontWeight: 700,
});

export const loseText = style({
  color: gameColorVars.outcome.loseForeground,
  fontWeight: 700,
});

export const remakeText = style({
  color: theme.color.mutedForeground,
  fontWeight: 700,
});

export const terminatedText = style({
  color: theme.color.mutedForeground,
  fontWeight: 700,
});

export const kdaText = style({
  color: theme.color.foreground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.75rem",
});

export const kdaCell = style({
  display: "grid",
  gridTemplateRows: "repeat(2, auto)",
  justifyItems: "end",
  alignItems: "center",
  gap: 2,
  lineHeight: 1,
});

export const positionText = style({
  color: theme.color.mutedForeground,
  fontSize: "0.68rem",
  fontWeight: 600,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  lineHeight: 1,
});

export const historyMeta = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 6,
  color: theme.color.mutedForeground,
  fontSize: "0.7rem",
  whiteSpace: "nowrap",
});

export const historyMetaCs = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 3,
});

export const matchBrief = style({
  display: "grid",
  gridTemplateRows: "repeat(2, 1fr)",
  justifyItems: "start",
  alignItems: "center",
  gap: 2,
  minWidth: 0,
  overflow: "hidden",
  textBoxTrim: "trim-both",
});

export const matchBriefDown = style({
  display: "grid",
  gridAutoFlow: "column",
  gap: 8,
  lineHeight: 1,
  alignItems: "center",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
});

export const queueNameText = style({
  display: "block",
  minWidth: 0,
  color: theme.color.foreground,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.65rem",
});

export const queueNameRow = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
});

export const historyPerformanceBadge = recipe({
  base: {
    fontSize: "0.6rem",
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
    fontStyle: "italic",
  },
  variants: {
    badge: {
      mvp: {
        color: "oklch(0.84 0.18 85)",
      },
      ace: {
        color: "oklch(0.62 0.18 280)",
      },
    },
  },
});

export const gameTimeText = style({
  color: theme.color.mutedForeground,
  fontSize: "0.68rem",
});

export const historyMetaIcon = style({
  width: 11,
  height: 11,
  color: theme.color.mutedForeground,
});

export const historyChampionAvatar = style({
  width: 35,
  height: 35,
  borderRadius: 4,
  objectFit: "contain",
  border: `1px solid ${theme.color.border}`,
});

export const historyChampionFallback = style({
  width: 35,
  height: 35,
  borderRadius: 4,
  background: theme.color.surface,
});
