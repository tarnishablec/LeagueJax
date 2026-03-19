import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css.ts";

export const wrapper = style({
  display: "grid",
  gap: 8,
});

export const card = recipe({
  base: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    alignItems: "start",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    border: `1px solid ${vars.color.border}`,
    background: vars.color.background,
    cursor: "pointer",
    transition: "background 140ms, border-color 140ms",
    selectors: {
      "&:hover": {
        background: vars.color.accent,
      },
    },
  },
  variants: {
    win: {
      true: {
        borderLeftWidth: 3,
        borderLeftColor: "oklch(0.73 0.18 142)",
      },
      false: {
        borderLeftWidth: 3,
        borderLeftColor: "oklch(0.55 0.2 20)",
      },
    },
  },
});

export const championIcon = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const championIconFallback = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
});

export const info = style({
  display: "grid",
  gap: 8,
  minWidth: 0,
});

export const headerRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, max-content))",
  gap: 6,
  alignItems: "center",
});

export const resultPill = recipe({
  base: {
    fontSize: "0.6875rem",
    fontWeight: 700,
    lineHeight: 1,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${vars.color.border}`,
    whiteSpace: "nowrap",
  },
  variants: {
    win: {
      true: {
        color: "oklch(0.76 0.16 142)",
        borderColor: "oklch(0.73 0.18 142 / 0.6)",
        background: "oklch(0.73 0.18 142 / 0.18)",
      },
      false: {
        color: "oklch(0.78 0.16 22)",
        borderColor: "oklch(0.62 0.18 20 / 0.6)",
        background: "oklch(0.62 0.18 20 / 0.16)",
      },
    },
  },
});

export const metaPill = style({
  fontSize: "0.6875rem",
  color: vars.color.mutedForeground,
  lineHeight: 1,
  padding: "4px 8px",
  borderRadius: 999,
  border: `1px solid ${vars.color.border}`,
  whiteSpace: "nowrap",
});

export const metricRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, max-content))",
  gap: 12,
  alignItems: "center",
});

export const kda = style({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const meta = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
  whiteSpace: "nowrap",
});

export const loadoutRow = style({
  display: "grid",
  gridTemplateColumns: "max-content max-content 1fr",
  gap: 10,
  alignItems: "center",
  minWidth: 0,
});

export const loadoutGroup = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

export const iconRow = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
});

export const assetIcon = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const assetIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 4,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
});

export const itemsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 22px)",
  gap: 4,
  minWidth: 0,
});

export const itemIcon = style({
  width: 22,
  height: 22,
  borderRadius: 5,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const itemIconFallback = style({
  width: 22,
  height: 22,
  borderRadius: 5,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
});

export const detail = style({
  padding: 16,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  display: "grid",
  gap: 8,
});

export const participantIcon = style({
  width: 24,
  height: 24,
  borderRadius: 4,
  objectFit: "cover",
});

export const participantIconFallback = style({
  width: 24,
  height: 24,
  borderRadius: 4,
  background: vars.color.accent,
});

export const participantRow = style({
  display: "grid",
  gridTemplateColumns: "24px 1fr repeat(3, 60px)",
  alignItems: "center",
  gap: 8,
  fontSize: "0.75rem",
  paddingBlock: 4,
  selectors: {
    "&:not(:last-child)": {
      borderBottom: `1px solid ${vars.color.border}`,
    },
  },
});

export const teamHeader = style({
  fontSize: "0.75rem",
  fontWeight: 600,
  color: vars.color.mutedForeground,
  paddingBlock: 4,
});

export const damageBar = style({
  height: 6,
  borderRadius: 3,
  background: vars.color.primary,
});
