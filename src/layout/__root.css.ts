import { createVar, type StyleRule, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../styles/theme.css";

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

export const logoButton = style({
  display: "inline-grid",
  placeItems: "center",
  // borderRight: `1px solid ${vars.color.border}`,
  // borderBottom: `1px solid ${vars.color.border}`,
  background: "transparent",
  userSelect: "none",
  overflow: "hidden",
});

export const logoIcon = style({
  transition: "all 200ms",
  cursor: "pointer",
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

export const sidebar = style({
  display: "grid",
  gridTemplateRows: "1fr auto",
  // borderRight: `1px solid ${vars.color.border}`,
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

const navBase: StyleRule = {
  display: "grid",
  placeItems: "center",
  borderRadius: 6,
  height: 36,
  fontSize: "0.95rem",
  color: vars.color.mutedForeground,
  transition: "all 150ms",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textDecoration: "none",
} as const;

const navHoverBg = `oklch(from ${vars.color.accent} l c h / 0.32)`;
const navActiveBg = `oklch(from ${vars.color.accent} l c h / 0.48)`;

export const navItem = recipe({
  base: {
    ...navBase,
    gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
    selectors: {
      "&:hover": {
        background: navHoverBg,
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
        background: navActiveBg,
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

export const navTooltipPositioner = style({
  zIndex: 1000,
});

export const navTooltipContent = style({
  borderRadius: 6,
  // border: `1px solid color-mix(in oklch, ${vars.color.primary} 34%, ${vars.color.popoverBorder})`,
  background: vars.color.popupBackground,
  color: vars.color.foreground,
  padding: "6px 11px",
  fontSize: "0.9rem",
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow: `0 8px 24px oklch(from ${vars.color.foreground} 0.25 c h / 0.18)`,
  selectors: {
    ":root.dark &": {
      boxShadow: `0 8px 24px oklch(from ${vars.color.backgroundRaw} 0.06 c h / 0.58)`,
    },
  },
});

export const main = style({
  overflow: "auto",
  // padding: 16,
});
