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

export const teamSection = style({
  display: "grid",
  gridTemplateRows: "1fr",
  gap: 8,
  minHeight: 0,
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
  gridTemplateColumns: `repeat(${teamColsVar}, minmax(0, 1fr))`,
  gap: 10,
  height: "100%",
  alignItems: "start",
  minWidth: 0,
  "@media": {
    "(max-width: 980px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "(max-width: 560px)": {
      gridTemplateColumns: "1fr",
    },
  },
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
});

export const playerCard = style({
  display: "grid",
  gridTemplateRows: "auto auto auto minmax(0, 1fr)",
  gap: 6,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 10,
  padding: 10,
  background: vars.color.accent,
  minWidth: 0,
  minHeight: 0,
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
  minHeight: 0,
  maxHeight: 176,
  overflowY: "auto",
  alignContent: "start",
  paddingRight: 2,
});

export const historyRow = style({
  display: "grid",
  gridTemplateColumns: "20px auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 6,
  fontSize: "0.74rem",
  minWidth: 0,
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

export const neutralText = style({
  color: vars.color.mutedForeground,
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
