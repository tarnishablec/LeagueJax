import { createVar, type StyleRule, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { layers } from "../styles/layers.css";
import { theme } from "../styles/theme.css";

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
  color: theme.color.foreground,
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
  display: "block",
  objectFit: "contain",
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
  color: `oklch(from ${theme.color.foreground} l c h / 0.6)`,
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
  overflow: "hidden",
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
  color: theme.color.mutedForeground,
  transition: "color 80ms ease-out",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textDecoration: "none",
  position: "relative",
} as const;

const tooltipSurface = `oklch(from ${theme.color.foreground} 0.26 0.012 h / 0.96)`;
const tooltipSurfaceDark = `oklch(from ${theme.color.background} 0.18 0.012 h / 0.98)`;
const tooltipShadowColor = `oklch(from ${theme.color.background} 0.05 c h / 0.46)`;

export const navItem = recipe({
  base: {
    ...navBase,
    gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
    selectors: {
      "&:hover": {
        background: theme.color.blurry,
        color: theme.color.foreground,
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
    adorned: {
      false: {},
      true: {},
    },
  },
  compoundVariants: [
    {
      variants: { active: true, collapsed: false },
      style: {
        background: theme.color.blurry,
        color: theme.color.accentForeground,
        fontWeight: 500,
        borderLeft: "2px solid",
        borderLeftColor: theme.color.primary,
      },
    },
    {
      variants: { active: true, collapsed: true },
      style: {
        background: `oklch(from ${theme.color.primary} l c h / 0.15)`,
        color: theme.color.primary,
        fontWeight: 500,
        selectors: {
          "&:hover": {
            background: `oklch(from ${theme.color.primary} l c h / 0.15)`,
            color: theme.color.primary,
          },
        },
      },
    },
  ],
  defaultVariants: {
    collapsed: false,
    active: false,
    adorned: false,
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
    adorned: {
      false: {},
      true: {
        paddingInlineEnd: 24,
      },
    },
  },
  defaultVariants: {
    collapsed: false,
    adorned: false,
  },
});

export const navEndAdornment = recipe({
  base: {
    position: "absolute",
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
  },
  variants: {
    collapsed: {
      false: {
        insetBlockStart: "50%",
        insetInlineEnd: 10,
        transform: "translateY(-50%)",
      },
      true: {
        insetBlockStart: 7,
        insetInlineEnd: 8,
        transform: "none",
      },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

export const navTooltipPositioner = style({});

export const navTooltipContent = style({
  zIndex: layers.overlay.tooltip,
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
        0 12px 30px oklch(from ${theme.color.background} 0.04 c h / 0.76),
        inset 0 1px 0 oklch(1 0 0 / 0.04)
      `,
    },
  },
});

export const toolbarSlot = style({
  display: "grid",
  alignItems: "center",
  height: "100%",
});

export const main = style({
  overflow: "hidden",
  // padding: 16,
});

export const routeTransitionSurface = style({
  display: "grid",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  position: "relative",
});

export const routeLayer = style({
  gridArea: "1 / 1",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  pointerEvents: "auto",
});
