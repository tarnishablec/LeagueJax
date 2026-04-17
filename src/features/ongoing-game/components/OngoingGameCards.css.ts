import { createVar, globalStyle, style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const teamColsVar = createVar();

export const teamSection = style({
  height: "calc(100% + 6px)",
  marginBottom: -6,
  overflowX: "scroll",
  overflowY: "hidden",
});

globalStyle(`${teamSection}::-webkit-scrollbar`, {
  height: 6,
  background: "transparent",
});

globalStyle(`${teamSection}::-webkit-scrollbar-thumb`, {
  background: "transparent",
  borderRadius: 3,
});

globalStyle(`${teamSection}:hover::-webkit-scrollbar-thumb`, {
  background: "oklch(0% 0 0 / 0.25)",
});

globalStyle(`${teamSection}:hover::-webkit-scrollbar-thumb:hover`, {
  background: "oklch(0% 0 0 / 0.4)",
});

globalStyle(`${teamSection}::-webkit-scrollbar-track`, {
  background: "transparent",
});

export const teamRow = style({
  display: "grid",
  gridTemplateColumns: `repeat(${teamColsVar}, minmax(230px, 300px))`,
  gap: 10,
  height: "100%",
  placeItems: "center",
  justifyContent: "space-between",
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: vars.color.mutedForeground,
  fontSize: "0.8rem",
  border: `1px dashed ${vars.color.border}`,
  borderRadius: 8,
  gridColumn: "1 / -1",
  width: "100%",
});

export const playerCard = style({
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 6,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 10,
  padding: "10px 6px",
  background: vars.color.surface,
  height: "100%",
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
  justifyContent: "start",
  alignItems: "center",
  gridTemplateRows: "repeat(2, 1fr)",
  gap: 3,
  height: "100%",
});

export const playerAvatarWrap = style({
  position: "relative",
  width: 40,
  height: 40,
});

export const championAvatar = style({
  width: "100%",
  height: "100%",
  borderRadius: 6,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const championAvatarFallback = style({
  width: 40,
  height: 40,
  borderRadius: 6,
  background: vars.color.border,
});

export const playerMetaSingle = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 4,
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
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
  background: "color-mix(in oklch, oklch(0.14 0.01 260) 72%, transparent)",
  border: `1px solid color-mix(in oklch, ${vars.color.background} 65%, transparent)`,
});

export const playerStats = style({
  fontSize: "0.78rem",
  color: vars.color.foreground,
  display: "grid",
  justifyContent: "end",
  minHeight: 16,
});

export const rankRow = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  justifyContent: "start",
  gap: 4,
  minWidth: 0,
});

export const rankMiniIcon = style({
  width: 14,
  height: 14,
  objectFit: "contain",
});

export const rankText = style({
  fontSize: "0.72rem",
  color: vars.color.mutedForeground,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const botLabel = style({
  fontSize: "0.78rem",
  fontWeight: 700,
  color: vars.color.foreground,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const historyList = style({
  display: "grid",
  gap: 4,
  overflowY: "auto",
  height: "100%",
  justifyItems: "stretch",
  alignItems: "center",
  alignContent: "start",
  scrollbarWidth: "none",
});

export const historyRow = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 6,
  fontSize: "0.74rem",
  borderRadius: 6,
  padding: "0 6px",
  height: 40,
  selectors: {
    "&:hover": {
      cursor: "pointer",
      filter: "brightness(1.08)",
    },
  },
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
  background: "oklch(0.06 0 0 / 0.62)",
  zIndex: 40,
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
  zIndex: 41,
  selectors: {
    "&[hidden]": { display: "none" },
  },
});

export const historyDialogContent = style({
  width: "min(820px, calc(100vw - 40px))",
  maxHeight: "calc(100vh - 40px)",
  overflow: "auto",
  borderRadius: 12,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popover,
  color: vars.color.foreground,
  padding: 14,
});

export const winRow = style({
  background: `color-mix(in oklch, ${vars.color.success} 12%, transparent)`,
});

export const loseRow = style({
  background: `color-mix(in oklch, ${vars.color.error} 12%, transparent)`,
});

export const remakeRow = style({
  background: `color-mix(in oklch, ${vars.color.mutedForeground} 8%, transparent)`,
});

export const terminatedRow = style({
  background: `color-mix(in oklch, ${vars.color.mutedForeground} 8%, transparent)`,
});

export const historyEmpty = style({
  color: vars.color.mutedForeground,
  height: "100%",
  fontSize: "0.72rem",
  textAlign: "center",
});

export const historyCenteredState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: vars.color.mutedForeground,
  fontSize: "0.72rem",
  textAlign: "center",
});

export const winText = style({
  color: vars.color.success,
  fontWeight: 700,
});

export const loseText = style({
  color: vars.color.error,
  fontWeight: 700,
});

export const remakeText = style({
  color: vars.color.mutedForeground,
  fontWeight: 700,
});

export const terminatedText = style({
  color: vars.color.mutedForeground,
  fontWeight: 700,
});

export const kdaText = style({
  color: vars.color.mutedForeground,
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
  color: vars.color.mutedForeground,
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
  color: vars.color.mutedForeground,
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
  overflow: "hidden",
  textBoxTrim: "trim-both",
});

export const matchBriefDown = style({
  display: "grid",
  gridAutoFlow: "column",
  gap: 8,
  lineHeight: 1,
  alignItems: "center",
});

export const queueNameText = style({
  color: vars.color.foreground,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.65rem",
});

export const gameTimeText = style({
  color: vars.color.mutedForeground,
  fontSize: "0.68rem",
});

export const historyMetaIcon = style({
  width: 11,
  height: 11,
  color: vars.color.mutedForeground,
});

export const historyChampionAvatar = style({
  width: 35,
  height: 35,
  borderRadius: 4,
  objectFit: "contain",
  border: `1px solid ${vars.color.border}`,
});

export const historyChampionFallback = style({
  width: 35,
  height: 35,
  borderRadius: 4,
  background: vars.color.border,
});
