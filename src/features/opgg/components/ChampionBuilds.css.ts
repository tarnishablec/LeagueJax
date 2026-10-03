import { createVar, fallbackVar, style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const pendingRowMinHeight = createVar();

export const content = style({
  display: "grid",
  gap: 6,
  minWidth: 0,
  containerType: "inline-size",
  containerName: "champion-builds",
});
export const skills = style({
  display: "grid",
  gap: 12,
  minWidth: 0,
  containerType: "inline-size",
  containerName: "champion-skills",
});
export const priority = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
  alignItems: "center",
  gap: 8,
});
export const priorityKeys = style({
  display: "grid",
  gridAutoFlow: "column",
  justifySelf: "end",
  alignItems: "center",
  gap: 6,
});
export const skillKey = style({
  display: "grid",
  placeItems: "center",
  width: 28,
  height: 28,
  borderRadius: 6,
  background: theme.color.accent,
  fontSize: "0.8125rem",
  fontWeight: 600,
});
export const prioritySkeleton = style({
  display: "block",
  width: 132,
  height: 28,
  borderRadius: 4,
  background: `rgb(from ${theme.color.foreground} r g b / 1%)`,
});
// Reserve the same responsive height as 18 levels while rendering two loading lines.
export const skillOrderFrame = style({
  display: "grid",
  minHeight: 159,
  "@container": {
    "champion-skills (min-width: 320px)": { minHeight: 104 },
    "champion-skills (min-width: 700px)": { minHeight: 49 },
  },
});
export const skillOrderSkeleton = style({
  display: "grid",
  gridTemplateRows: "repeat(2, minmax(0, 1fr))",
  gap: 6,
});
export const skillOrderLine = style({
  display: "block",
  width: "100%",
  borderRadius: 4,
  background: `rgb(from ${theme.color.foreground} r g b / 1%)`,
});
export const statsSkeleton = style({
  display: "block",
  width: 140,
  maxWidth: "100%",
  height: 18,
  borderRadius: 4,
  background: `rgb(from ${theme.color.foreground} r g b / 1%)`,
});
export const skillOrder = style({
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 6,
  "@container": {
    "champion-skills (min-width: 320px)": {
      gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
    },
    "champion-skills (min-width: 700px)": {
      gridTemplateColumns: "repeat(18, minmax(0, 1fr))",
    },
  },
});
export const skillStep = style({
  display: "grid",
  justifyItems: "center",
  gap: 4,
  padding: "6px 0",
  lineHeight: 1.5,
  borderRadius: 4,
  background: theme.color.surface,
  fontSize: "0.75rem",
  fontWeight: 600,
  selectors: {
    '&[data-ultimate="true"]': {
      color: theme.color.primary,
      background: theme.color.tint,
    },
  },
});
export const level = style({
  fontSize: "0.625rem",
  color: theme.color.mutedForeground,
  fontWeight: 400,
});
export const skillStats = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  fontSize: "0.75rem",
  minHeight: 18,
});
export const buildRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 52px",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  minHeight: fallbackVar(pendingRowMinHeight, "56px"),
  fontSize: "0.75rem",
  "@container": {
    "champion-builds (min-width: 300px)": {
      gridTemplateColumns: "minmax(68px, 0.8fr) minmax(0, 1.2fr) 52px",
      minHeight: fallbackVar(pendingRowMinHeight, "36px"),
    },
  },
});
export const buildRowSkeleton = style({
  display: "block",
  gridColumn: "1 / -1",
  width: "100%",
  alignSelf: "stretch",
  minHeight: 24,
  marginBlock: 3,
  borderRadius: 4,
  background: `rgb(from ${theme.color.foreground} r g b / 1%)`,
});
export const situationalRow = style([
  buildRow,
  {
    borderTop: `1px solid ${theme.color.border}`,
    marginTop: 6,
    paddingTop: 12,
    minHeight: fallbackVar(pendingRowMinHeight, "69px"),
    "@container": {
      "champion-builds (min-width: 300px)": {
        minHeight: fallbackVar(pendingRowMinHeight, "43px"),
      },
    },
  },
]);
export const buildLabel = style({
  gridColumn: "1 / -1",
  "@container": {
    "champion-builds (min-width: 300px)": { gridColumn: "auto" },
  },
});
export const buildRate = style({ justifySelf: "end" });
export const icons = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, 30px)",
  justifyContent: "start",
  gap: 6,
  minWidth: 0,
  minHeight: 30,
  alignItems: "center",
});
export const icon = style({
  width: 30,
  height: 30,
  borderRadius: 5,
  background: theme.color.surface,
});
export const buildHeading = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "baseline",
  gap: 12,
});
export const builds = style({ display: "grid", gap: 4 });
