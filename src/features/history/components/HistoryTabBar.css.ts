import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css.ts";

export const container = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "start",
  overflowX: "auto",
  maxWidth: 560,
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
});

export const tab = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 16px",
    alignItems: "center",
    gap: 6,
    height: 32,
    maxWidth: 140,
    paddingInline: 8,
    fontSize: "0.75rem",
    color: vars.color.mutedForeground,
    cursor: "default",
    background: "transparent",
    whiteSpace: "nowrap",
    borderBottom: "2px solid transparent",
    transition: "color 100ms, background 100ms",
    borderRadius: "4px 4px 0 0",
    selectors: {
      "&:hover": {
        color: vars.color.foreground,
        background: vars.color.accent,
      },
    },
  },
  variants: {
    active: {
      true: {
        color: vars.color.foreground,
        borderBottomColor: vars.color.primary,
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const tabMain = style({
  display: "grid",
  gridTemplateColumns: "16px minmax(0, 1fr)",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  height: "100%",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  padding: 0,
  margin: 0,
  font: "inherit",
  textAlign: "start",
});

export const tabLabel = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: "0.75rem",
  lineHeight: 1,
});

export const tabIcon = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  objectFit: "cover",
});

export const tabIconFallback = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  background: vars.color.accent,
});

export const closeButton = style({
  display: "grid",
  placeItems: "center",
  width: 16,
  height: 16,
  borderRadius: 4,
  border: "none",
  background: "transparent",
  color: vars.color.mutedForeground,
  cursor: "pointer",
  padding: 0,
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.accent,
    },
  },
});
