import { createVar, type StyleRule, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../styles/theme.css";

/* ── Layout shell ── */

export const sidebarWidth = createVar();
export const iconCol = createVar();
export const navPad = createVar();

export const shell = style({
  vars: {
    [iconCol]: "2.5rem",
    [navPad]: "4px",
  },
  display: "grid",
  height: "100vh",
  gridTemplateRows: "3rem 1fr",
  gridTemplateColumns: sidebarWidth,
  background: "transparent",
  color: vars.color.foreground,
  transition: "grid-template-columns 200ms ease-in-out",
  overflow: "hidden",
});

/* ── Sidebar logo / collapse button ── */

export const logoButton = style({
  display: "grid",
  placeItems: "center",
  position: "relative",
  borderRight: `1px solid ${vars.color.border}`,
  borderBottom: `1px solid ${vars.color.border}`,
  background: "transparent",
  userSelect: "none",
  overflow: "hidden",
});

export const logoIcon = style({
  transition: "all 200ms",
  selectors: {
    [`${logoButton}:hover &`]: {
      opacity: 0,
      transform: "scale(0.75)",
    },
  },
});

export const collapseIcon = style({
  position: "absolute",
  color: `oklch(from ${vars.color.foreground} l c h / 0.6)`,
  opacity: 0,
  transition: "all 200ms",
  transform: "scale(0.75)",
  selectors: {
    [`${logoButton}:hover &`]: {
      opacity: 1,
      transform: "scale(1)",
    },
  },
});

/* ── Sidebar ── */

export const sidebar = style({
  display: "grid",
  gridTemplateRows: "1fr auto",
  borderRight: `1px solid ${vars.color.border}`,
  overflow: "hidden",
});

export const navList = style({
  overflowY: "auto",
  overflowX: "hidden",
  paddingBlock: 12,
  paddingInline: navPad,
  display: "grid",
  gridAutoFlow: "row",
  alignContent: "start",
  gap: 4,
});

/* ── Nav items ── */

const navBase: StyleRule = {
  display: "grid",
  placeItems: "center",
  borderRadius: 6,
  height: 36,
  fontSize: "0.875rem",
  color: vars.color.mutedForeground,
  transition: "all 150ms",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textDecoration: "none",
} as const;

export const navItem = recipe({
  base: {
    ...navBase,
    gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
    selectors: {
      "&:hover": {
        background: vars.color.accent,
        color: vars.color.foreground,
      },
    },
  },
  variants: {
    collapsed: {
      false: {},
      true: {},
    },
    active: {
      false: {},
      true: {},
    },
  },
  compoundVariants: [
    {
      variants: { active: true, collapsed: false },
      style: {
        background: vars.color.accent,
        color: vars.color.accentForeground,
        fontWeight: 500,
        borderLeft: `2px solid ${vars.color.primary}`,
      },
    },
    {
      variants: { active: true, collapsed: true },
      style: {
        background: `oklch(from ${vars.color.primary} l c h / 0.15)`,
        color: vars.color.primary,
        fontWeight: 500,
      },
    },
  ],
  defaultVariants: {
    collapsed: false,
    active: false,
  },
});

export const navIcon = style({
  justifySelf: "center",
  transition: "width 200ms, height 200ms",
});

export const navLabel = recipe({
  base: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    justifySelf: "start",
    transition: "opacity 150ms",
  },
  variants: {
    collapsed: {
      false: { opacity: 1 },
      true: { opacity: 0 },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

/* ── Main content ── */

export const main = style({
  overflow: "auto",
  padding: 24,
});
