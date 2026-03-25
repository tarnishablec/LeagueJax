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
  gap: 6,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 10,
  padding: 10,
  background: vars.color.accent,
  minWidth: 0,
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
