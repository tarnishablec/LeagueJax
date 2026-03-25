import { createVar, style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const teamColsVar = createVar();

export const page = style({
  display: "grid",
  gridTemplateRows: "repeat(2, 1fr)",
  gap: 14,
  alignContent: "start",
  minHeight: 0,
  height: "100%",
  padding: "12px",
  paddingTop: 4,
});

export const idlePage = style({
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  justifyItems: "center",
  gap: 12,
  minHeight: 0,
  height: "100%",
  padding: "12px",
  paddingTop: 4,
});

export const idleIcon = style({
  width: 88,
  height: 88,
  color: vars.color.mutedForeground,
  opacity: 0.82,
});

export const idleText = style({
  fontSize: "1rem",
  color: vars.color.mutedForeground,
  textAlign: "center",
  fontWeight: 600,
});

export const teamSection = style({
  display: "block",
  height: "100%",
  overflow: "hidden",
});

export const blueTitle = style({
  color: "oklch(0.67 0.16 248)",
  height: "100%",
});

export const redTitle = style({
  color: "oklch(0.62 0.2 28)",
});

export const teamRow = style({
  display: "grid",
  gridTemplateColumns: `repeat(${teamColsVar}, minmax(225px, 300px))`,
  gap: 10,
  height: "100%",
  placeItems: "center",
  justifyContent: "space-between",
  overflowX: "auto",
  // "@media": {
  //   "(max-width: 980px)": {
  //     gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  //   },
  //   "(max-width: 560px)": {
  //     gridTemplateColumns: "1fr",
  //   },
  // },
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
  gridTemplateRows: "auto auto auto auto 1fr",
  gap: 6,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 10,
  padding: `10px 6px`,
  background: vars.color.accent,
  height: "100%",
  overflow: "hidden",
  width: "100%",
});

export const playerHeader = style({
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

export const championAvatar = style({
  width: 24,
  height: 24,
  borderRadius: 6,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const championAvatarFallback = style({
  width: 24,
  height: 24,
  borderRadius: 6,
  background: vars.color.border,
});

export const playerName = style({
  fontWeight: 700,
  fontSize: "0.83rem",
  color: vars.color.foreground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const playerMeta = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 4,
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const playerStats = style({
  fontSize: "0.78rem",
  color: vars.color.foreground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const historyList = style({
  display: "grid",
  gap: 4,
  overflowY: "auto",
  alignContent: "start",
  paddingRight: 2,
  height: "100%",
});

export const historyRow = style({
  display: "grid",
  gridTemplateColumns: "20px auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 6,
  fontSize: "0.74rem",
  height: "35px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: 6,
  padding: "0 6px",
  background: vars.color.accent,
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: vars.color.background,
    },
  },
});

export const historyEmpty = style({
  color: vars.color.mutedForeground,
  fontSize: "0.72rem",
});

export const winText = style({
  color: "oklch(0.78 0.17 150)",
  fontWeight: 700,
});

export const loseText = style({
  color: "oklch(0.67 0.2 28)",
  fontWeight: 700,
});

export const remakeText = style({
  color: "oklch(0.83 0.1 96)",
  fontWeight: 700,
});

export const terminatedText = style({
  color: "oklch(0.7 0.03 255)",
  fontWeight: 700,
});

export const kdaText = style({
  color: vars.color.foreground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const historyMeta = style({
  color: vars.color.mutedForeground,
  fontSize: "0.7rem",
  whiteSpace: "nowrap",
});

export const historyChampionAvatar = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const historyChampionFallback = style({
  width: 18,
  height: 18,
  borderRadius: 4,
  background: vars.color.border,
});
