import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css";

export const container = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "end",
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
    gridTemplateColumns: "16px minmax(0, 1fr) 16px",
    alignItems: "center",
    gap: 6,
    height: 32,
    maxWidth: 140,
    paddingInline: 8,
    fontSize: "0.75rem",
    color: vars.color.mutedForeground,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    font: "inherit",
    textAlign: "start",
    whiteSpace: "nowrap",
    borderBottom: "2px solid transparent",
    transition: "color 100ms, background 100ms",
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

export const tabLabel = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
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
