import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css.ts";

export const card = recipe({
  base: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "48px 1fr auto",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    border: `1px solid ${vars.color.border}`,
    cursor: "pointer",
    transition: "background 150ms",
    selectors: {
      "&:hover": { background: vars.color.accent },
    },
  },
  variants: {
    win: {
      true: { borderLeftWidth: 3, borderLeftColor: "oklch(0.73 0.18 142)" },
      false: { borderLeftWidth: 3, borderLeftColor: "oklch(0.55 0.2 20)" },
    },
  },
});

export const championIcon = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  objectFit: "cover",
});

export const championIconFallback = style({
  width: 48,
  height: 48,
  borderRadius: 8,
  background: vars.color.accent,
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

export const info = style({
  display: "grid",
  gap: 2,
});

export const kda = style({
  fontSize: "0.875rem",
  fontWeight: 500,
  color: vars.color.foreground,
});

export const meta = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const detail = style({
  padding: 16,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  display: "grid",
  gap: 8,
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
