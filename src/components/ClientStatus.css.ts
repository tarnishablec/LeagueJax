import { createVar, globalStyle, keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { iconCol } from "@/layout/__root.css";
import { layers } from "@/styles/layers.css";
import { theme } from "@/styles/theme.css";

const tooltipSurface = `color-mix(in srgb, ${theme.color.primary}, transparent 0.75)`;
const tooltipSurfaceDark = `color-mix(in srgb, ${theme.color.primary}, transparent 0.875)`;
const tooltipShadowColor = `oklch(from ${theme.color.background} 0.05 c h / 0.46)`;
const detectedBadgeBackground = `
  radial-gradient(
     circle, 
     ${theme.color.success} 0%, 
     color-mix(in srgb, ${theme.color.success}, transparent 40%) 40%,
     color-mix(in srgb, ${theme.color.success}, transparent 80%) 70%,
     transparent 100%
  )
`;

const badgeFadeIn = keyframes({
  "0%": { opacity: 0 },
  "100%": { opacity: 1 },
});

// ─── Trigger area (unchanged) ───────────────────────────────────────────────

export const container = style({
  position: "relative",
});

export const trigger = recipe({
  base: {
    width: "100%",
    display: "grid",
    placeItems: "center",
    borderRadius: 6,
    height: 36,
    fontSize: "0.95rem",
    color: theme.color.mutedForeground,
    transition: "all 150ms",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textDecoration: "none",
    cursor: "pointer",
    selectors: {
      "&:hover": {
        background: `rgba(0, 0, 0, 0.2)`,
        color: theme.color.foreground,
      },
    },
  },
  variants: {
    collapsed: {
      false: {
        gridTemplateColumns: `${iconCol} minmax(0, 1fr) auto`,
      },
      true: {
        gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
      },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

export const avatarSizeVar = createVar();

export const avatar = style({
  width: avatarSizeVar,
  height: avatarSizeVar,
  borderRadius: "50%",
  objectFit: "cover",
  justifySelf: "center",
  transformOrigin: "center",
});

export const triggerIconFrame = style({
  display: "grid",
  placeItems: "center",
  justifySelf: "center",
  width: 16,
  height: 16,
  position: "relative",
});

export const iconScale = recipe({
  base: {
    transition: "transform 200ms ease",
    transformOrigin: "center",
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

const spinRotate = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});

const spinDash = keyframes({
  "0%": { strokeDasharray: "1, 150", strokeDashoffset: "0" },
  "50%": { strokeDasharray: "90, 150", strokeDashoffset: "-35" },
  "100%": { strokeDasharray: "1, 150", strokeDashoffset: "-124" },
});

const spin = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});

export const avatarLoading = style({
  width: avatarSizeVar,
  height: avatarSizeVar,
  borderRadius: "50%",
  border: `2px solid ${theme.color.mutedForeground}`,
  borderTopColor: theme.color.primary,
  justifySelf: "center",
  animation: `${spin} 1s linear infinite`,
});

export const connectingIcon = style({
  justifySelf: "center",
  animation: `${spinRotate} 2s linear infinite`,
});

globalStyle(`${connectingIcon} circle`, {
  animation: `${spinDash} 1.4s ease-in-out infinite`,
  transformOrigin: "center",
});

export const unplugIcon = recipe({
  base: {
    gridArea: "1 / 1",
    transition: "opacity 160ms ease-out",
  },
  variants: {
    dimmed: {
      false: {
        opacity: 1,
      },
      true: {
        opacity: 0,
      },
    },
  },
  defaultVariants: {
    dimmed: false,
  },
});

export const label = recipe({
  base: {
    display: "inline-block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    justifySelf: "start",
    transition: "opacity 150ms",
    paddingRight: "1rem",
    width: "100%",
    textAlign: "start",
    fontSize: "0.875rem",
    lineHeight: 1,
    textBoxTrim: "trim-both",
  },
  variants: {
    collapsed: {
      false: { opacity: 1 },
      true: { opacity: 0, width: 0 },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

export const detectedBadge = style({
  width: 18,
  height: 18,
  display: "grid",
  placeItems: "center",
  justifySelf: "end",
  marginRight: 10,
  borderRadius: "50%",
  background: detectedBadgeBackground,
  color: "rgb(7 35 8)",
  fontSize: "0.6875rem",
  fontWeight: 700,
  lineHeight: 1,
  fontVariantNumeric: "tabular-nums",
  animation: `${badgeFadeIn} 160ms ease-out both`,
});

export const collapsedDetectedBadge = recipe({
  base: {
    gridArea: "1 / 1",
    width: 14.4,
    height: 14.4,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: detectedBadgeBackground,
    color: "rgb(7 35 8)",
    fontSize: "0.55rem",
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    pointerEvents: "none",
    transition: "opacity 160ms ease-out",
  },
  variants: {
    visible: {
      false: {
        opacity: 0,
      },
      true: {
        opacity: 1,
      },
    },
  },
  defaultVariants: {
    visible: false,
  },
});

// ─── Tooltip container ──────────────────────────────────────────────────────

export const tooltip = style({
  minWidth: 264,
  borderRadius: 8,
  background: tooltipSurface,
  // border: `1px solid ${vars.color.popoverBorder}`,
  boxShadow: `
    0 12px 30px ${tooltipShadowColor},
    inset 0 1px 0 oklch(1 0 0 / 0.05)
  `,
  display: "grid",
  gridAutoRows: "auto",
  gap: 8,
  // color: "oklch(0.96 0 0)",
  fontSize: "0.975rem",
  zIndex: layers.overlay.tooltip,
  selectors: {
    ":root.dark &": {
      background: tooltipSurfaceDark,
      boxShadow: `
        0 12px 30px oklch(from ${theme.color.background} 0.06 c h / 0.72),
        inset 0 1px 0 oklch(1 0 0 / 0.04)
      `,
    },
  },
});

export const emptyTooltip = style({
  borderRadius: 6,
  // border: `1px solid color-mix(in oklch, ${vars.color.primary} 34%, ${vars.color.popoverBorder})`,
  background: tooltipSurface,
  color: theme.color.foreground,
  padding: "6px 11px",
  fontSize: "0.9rem",
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow: `
    0 10px 28px ${tooltipShadowColor},
    inset 0 1px 0 oklch(1 0 0 / 0.05)
  `,
  zIndex: layers.overlay.tooltip,
  selectors: {
    ":root.dark &": {
      background: tooltipSurfaceDark,
      boxShadow: `
        0 12px 30px oklch(from ${theme.color.background} 0.06 c h / 0.72),
        inset 0 1px 0 oklch(1 0 0 / 0.04)
      `,
    },
  },
});

// ─── Unfocus button ─────────────────────────────────────────────────────────

export const unfocusButton = style({
  display: "grid",
  placeItems: "center",
  borderRadius: 4,
  border: "none",
  background: "transparent",
  color: theme.color.mutedForeground,
  cursor: "pointer",
  alignSelf: "center",
  transition: "color 150ms, background 150ms",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
      // background: vars.color.accent,
    },
  },
});

// ─── Section header ─────────────────────────────────────────────────────────

// export const sectionHeader = style({
//   fontSize: "0.6875rem",
//   fontWeight: 600,
//   textTransform: "uppercase",
//   color: vars.color.mutedForeground,
//   letterSpacing: "0.04em",
// });

// ─── Instance list ──────────────────────────────────────────────────────────

export const instanceList = style({
  display: "grid",
  gap: 4,
  maxHeight: 240,
  width: 300,
  overflowY: "auto",
});

export const instanceRow = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "auto 1fr minmax(30px, auto)",
    alignItems: "center",
    gap: 14,
    padding: "7px 10px",
    borderRadius: 6,
    cursor: "default",
    border: "none",
    boxShadow: "none",
    width: "100%",
    background: `oklch(from ${tooltipSurface} l c h / 0.52)`,
    color: "inherit",
    font: "inherit",
    fontSize: "inherit",
    textAlign: "start",
  },
  variants: {
    focused: {
      true: {
        // borderLeft: `2px solid ${vars.color.primary}`,
        background: `color-mix(in srgb, ${theme.color.primary} 15%, ${theme.color.background})`,
      },
    },
    clickable: {
      true: {
        cursor: "pointer",
        background: `color-mix(in srgb, ${theme.color.accent} 5%, ${theme.color.background})`,
        selectors: {
          "&:hover": {
            background: `color-mix(in srgb, ${theme.color.accent} 30%, ${theme.color.background})`,
          },
        },
      },
    },
    disabled: {
      true: {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  },
  defaultVariants: {
    focused: false,
    clickable: false,
    disabled: false,
  },
});

export const instanceIcon = style({
  width: 24,
  height: 24,
  borderRadius: "50%",
  objectFit: "cover",
});

export const instanceIconFallback = style({
  width: 24,
  height: 24,
  display: "grid",
  placeItems: "center",
  color: theme.color.mutedForeground,
});

export const instanceInfo = style({
  display: "grid",
  gap: 1,
  minWidth: 0,
});

export const instancePath = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.875rem",
});

export const instancePid = style({
  color: theme.color.mutedForeground,
  fontSize: "0.84rem",
  textBoxTrim: "trim-end",
});

// ─── State indicator ────────────────────────────────────────────────────────

const pulse = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.4 },
});

export const stateIndicator = recipe({
  base: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
    justifySelf: "center",
  },
  variants: {
    state: {
      ready: {
        background: theme.color.success,
      },
      authenticating: {
        background: theme.color.primary,
        animation: `${pulse} 1.5s ease-in-out infinite`,
      },
      closing: {
        background: theme.color.mutedForeground,
      },
    },
  },
  defaultVariants: {
    state: "ready",
  },
});

// ─── Empty state ────────────────────────────────────────────────────────────

// export const emptyText = style({
//   padding: "8px 4px",
//   color: vars.color.mutedForeground,
//   textAlign: "center",
// });
