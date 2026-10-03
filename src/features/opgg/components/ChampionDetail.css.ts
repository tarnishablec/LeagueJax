import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { theme } from "@/styles/theme.css";

export const panel = style({
  display: "grid",
  gridTemplateRows: "auto auto minmax(0, 1fr)",
  gap: 8,
  minWidth: 0,
  minHeight: 0,
  containerType: "inline-size",
  containerName: "champion-detail",
});
export const header = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 12,
  minWidth: 0,
  "@container": {
    "champion-detail (min-width: 600px)": {
      gridTemplateColumns: "minmax(0, 1fr) auto",
      alignItems: "center",
    },
  },
});
export const identity = style({
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
});
export const portrait = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  background: theme.color.surface,
});
export const titleRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, max-content) auto",
  alignItems: "center",
  justifyContent: "start",
  gap: 8,
  minWidth: 0,
});
export const title = style({
  margin: 0,
  fontSize: "1.125rem",
  fontWeight: 600,
  lineHeight: 1.4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
export const tier = style({
  padding: "3px 6px",
  borderRadius: 4,
  background: theme.color.surface,
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  whiteSpace: "nowrap",
});
export const source = style({
  margin: "4px 0 0",
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  lineHeight: 1.5,
  selectors: {
    '&[data-error="true"]': { color: theme.color.error },
  },
});
export const stats = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
  margin: 0,
});
export const stat = style({ display: "grid", gap: 5 });
export const statValue = style({ margin: 0, fontSize: "0.9375rem" });
export const positionPlaceholder = style({
  minHeight: 34,
  borderBottom: `1px solid ${theme.color.border}`,
});
export const content = style({
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  height: "100%",
  overflow: "hidden",
  minHeight: 0,
  minWidth: 0,
});
export const scrollFrame = recipe({
  base: {
    display: "grid",
    gridTemplateRows: "minmax(0, 1fr)",
    minHeight: 0,
    minWidth: 0,
  },
  variants: {
    stacked: {
      true: { paddingInlineEnd: 12 },
      false: { paddingInlineEnd: 0 },
    },
  },
});
export const pageContent = recipe({
  base: { minWidth: 0, minHeight: 0 },
  variants: {
    stacked: {
      true: { height: "auto" },
      false: { height: "100%" },
    },
  },
});
export const scroller = style({
  gridTemplateRows: "minmax(0, 1fr)",
  minHeight: 0,
  minWidth: 0,
});
export const viewport = style({
  overscrollBehaviorY: "contain",
  selectors: {
    "&:focus-visible": {
      outline: `1px solid ${theme.color.primary}`,
      outlineOffset: -1,
    },
  },
});
export const body = recipe({
  base: {
    display: "grid",
    gap: 12,
    minHeight: 0,
    minWidth: 0,
  },
  variants: {
    stacked: {
      true: {
        gridTemplateColumns: "minmax(0, 1fr)",
        gridAutoRows: "auto",
        alignContent: "start",
      },
      false: {
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridTemplateRows: "auto 1fr",
        // paddingInlineEnd: 12,
        height: "100%",
      },
    },
  },
});
