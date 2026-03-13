import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { iconCol } from "@/routes/__root.css";
import { vars } from "@/styles/theme.css";

// ─── Trigger area (unchanged) ───────────────────────────────────────────────

export const container = style({
  position: "relative",
});

export const trigger = recipe({
  base: {
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

export const label = recipe({
  base: {
    display: "inline-block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    justifySelf: "start",
    transition: "opacity 150ms",
    paddingRight: "1rem",
    width: "100%",
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
  padding: 8,
  borderRadius: 8,
  background: "oklch(0.18 0.015 270 / 0.95)",
  border: "1px solid oklch(1 0 0 / 0.12)",
  boxShadow: "0 0 2px 2px oklch(0 0 0 / 0.12)",
  display: "grid",
  gridAutoRows: "auto",
  gap: 8,
  color: "oklch(0.985 0 0)",
  fontSize: "0.8125rem",
  zIndex: 1000,
});

// ─── Connected client card ──────────────────────────────────────────────────

export const connectedCard = style({
  display: "grid",
  gridTemplateColumns: "36px 1fr",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid oklch(1 0 0 / 0.08)",
  background: "oklch(0.22 0.02 270 / 0.8)",
});

export const profileIcon = style({
  width: 36,
  height: 36,
  borderRadius: "50%",
  objectFit: "cover",
  alignSelf: "center",
});

export const summonerInfo = style({
  display: "grid",
  alignContent: "center",
  gap: 2,
  minWidth: 0,
});

export const summonerName = style({
  fontWeight: 600,
  color: "oklch(0.985 0 0)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const summonerTag = style({
  fontWeight: 400,
  color: "oklch(1 0 0 / 0.5)",
});

export const summonerLevel = style({
  fontSize: "0.75rem",
  color: "oklch(1 0 0 / 0.5)",
});

// ─── Section header ─────────────────────────────────────────────────────────

export const sectionHeader = style({
  fontSize: "0.6875rem",
  fontWeight: 600,
  textTransform: "uppercase",
  color: "oklch(1 0 0 / 0.73)",
  letterSpacing: "0.04em",
});

// ─── Instance list ──────────────────────────────────────────────────────────

export const instanceList = style({
  display: "grid",
  gap: 4,
  maxHeight: 240,
  overflowY: "auto",
});

export const instanceRow = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    borderRadius: 6,
    cursor: "default",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "inherit",
    font: "inherit",
    fontSize: "inherit",
    textAlign: "start",
  },
  variants: {
    clickable: {
      true: {
        cursor: "pointer",
        selectors: {
          "&:hover": {
            background: "oklch(1 0 0 / 0.06)",
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
    clickable: false,
    disabled: false,
  },
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
  color: "oklch(1 0 0 / 0.45)",
  fontSize: "0.7rem",
});

// ─── State indicator ────────────────────────────────────────────────────────

const pulse = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.4 },
});

export const stateIndicator = recipe({
  base: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
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
        background: "oklch(1 0 0 / 0.3)",
      },
    },
  },
  defaultVariants: {
    state: "ready",
  },
});

// ─── Separator ──────────────────────────────────────────────────────────────

export const separator = style({
  height: 1,
  background: "oklch(1 0 0 / 0.08)",
});

// ─── Empty state ────────────────────────────────────────────────────────────

export const emptyText = style({
  padding: "8px 4px",
  color: "oklch(1 0 0 / 0.5)",
  textAlign: "center",
});
