import { createVar, keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { iconCol } from "@/routes/__root.css";
import { vars } from "@/styles/theme.css";

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
    fontSize: "0.875rem",
    color: vars.color.mutedForeground,
    transition: "all 150ms",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textDecoration: "none",
    cursor: "pointer",
    selectors: {
      "&:hover": {
        background: vars.color.accent,
        color: vars.color.foreground,
      },
    },
  },
  variants: {
    collapsed: {
      false: {
        gridTemplateColumns: `${iconCol} minmax(0, 1fr)`,
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

export const avatar = style({
  borderRadius: "50%",
  objectFit: "cover",
  justifySelf: "center",
});

export const avatarSizeVar = createVar();

const spin = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});

export const avatarLoading = style({
  width: avatarSizeVar,
  height: avatarSizeVar,
  borderRadius: "50%",
  border: `2px solid ${vars.color.mutedForeground}`,
  borderTopColor: vars.color.primary,
  justifySelf: "center",
  animation: `${spin} 1s linear infinite`,
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

// ─── Tooltip container ──────────────────────────────────────────────────────

export const tooltip = style({
  minWidth: 220,
  // padding: 8,
  borderRadius: 8,
  background: "transparent",
  // border: `1px solid ${vars.color.popoverBorder}`,
  // boxShadow: "0 0 2px 2px oklch(0 0 0 / 0.12)",
  display: "grid",
  gridAutoRows: "auto",
  gap: 8,
  color: vars.color.foreground,
  fontSize: "0.8125rem",
  zIndex: 1000,
});

// ─── Unfocus button ─────────────────────────────────────────────────────────

export const unfocusButton = style({
  display: "grid",
  placeItems: "center",
  borderRadius: 4,
  border: "none",
  background: "transparent",
  color: vars.color.mutedForeground,
  cursor: "pointer",
  alignSelf: "center",
  transition: "color 150ms, background 150ms",
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
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
  width: 250,
  overflowY: "auto",
});

export const instanceRow = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "auto 1fr minmax(30px, auto)",
    alignItems: "center",
    gap: 14,
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "default",
    border: `1px solid ${vars.color.popoverBorder}`,
    boxShadow: "0 0 2px 2px oklch(0 0 0 / 0.12)",
    width: "100%",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "inherit",
    textAlign: "start",
  },
  variants: {
    focused: {
      true: {
        borderLeft: `2px solid ${vars.color.primary}`,
        background: `color-mix(in srgb, ${vars.color.primary} 15%, ${vars.color.backgroundRaw})`,
      },
    },
    clickable: {
      true: {
        cursor: "pointer",
        background: `color-mix(in srgb, ${vars.color.accent} 5%, ${vars.color.backgroundRaw})`,
        selectors: {
          "&:hover": {
            background: `color-mix(in srgb, ${vars.color.accent} 30%, ${vars.color.backgroundRaw})`,
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
  color: vars.color.mutedForeground,
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
  fontSize: "0.8125rem",
});

export const instancePid = style({
  color: vars.color.mutedForeground,
  fontSize: "0.7rem",
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
        background: vars.color.success,
      },
      authenticating: {
        background: vars.color.primary,
        animation: `${pulse} 1.5s ease-in-out infinite`,
      },
      closing: {
        background: vars.color.mutedForeground,
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
