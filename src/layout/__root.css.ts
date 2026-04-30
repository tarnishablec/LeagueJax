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
  borderLeft: "2px solid transparent",
  color: vars.color.mutedForeground,
  transition: "color 80ms ease-out",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textDecoration: "none",
} as const;

const tooltipSurface = `oklch(from ${vars.color.foreground} 0.26 0.012 h / 0.96)`;
const tooltipSurfaceDark = `oklch(from ${vars.color.background} 0.18 0.012 h / 0.98)`;
const tooltipShadowColor = `oklch(from ${vars.color.background} 0.05 c h / 0.46)`;

export const navItem = recipe({
  base: {
    ...navBase,
    gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
    selectors: {
      "&:hover": {
        background: vars.color.blurry,
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
        background: vars.color.blurry,
        color: vars.color.accentForeground,
        fontWeight: 500,
        borderLeftColor: vars.color.primary,
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

export const navIcon = recipe({
  base: {
    display: "block",
    justifySelf: "center",
    transformOrigin: "center",
    transition: "transform 200ms ease",
  },
  variants: {
    collapsed: {
      false: {
        transform: "scale(1)",
      },
      true: {
        transform: "scale(1.25)",
      },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

export const navLabel = recipe({
  base: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    justifySelf: "start",
    transition: "opacity 150ms",
    fontSize: "0.925rem",
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
  background: tooltipSurface,
  color: "oklch(0.96 0 0)",
  padding: "6px 11px",
  fontSize: "0.9rem",
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow: `
    0 10px 28px ${tooltipShadowColor},
    inset 0 1px 0 oklch(1 0 0 / 0.05)
  `,
  selectors: {
    ":root.dark &": {
      background: tooltipSurfaceDark,
      boxShadow: `
        0 12px 30px oklch(from ${vars.color.background} 0.04 c h / 0.76),
        inset 0 1px 0 oklch(1 0 0 / 0.04)
      `,
    },
  },
});

export const main = style({
  overflow: "auto",
  // padding: 16,
});
