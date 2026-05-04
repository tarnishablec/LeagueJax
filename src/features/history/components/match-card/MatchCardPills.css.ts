import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { layers } from "@/styles/layers.css.ts";
import { theme } from "@/styles/theme.css.ts";

export const root = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
});

export const tagPill = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.6875rem",
    fontWeight: 700,
    lineHeight: 1,
    padding: "4px 8px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  variants: {
    tag: {
      penta: {
        color: "oklch(0.85 0.18 85)",
        borderColor: "oklch(0.85 0.18 85 / 0.5)",
        background: "oklch(0.85 0.18 85 / 0.15)",
        border: "1px solid oklch(0.85 0.18 85 / 0.5)",
      },
      quadra: {
        color: "oklch(0.72 0.19 62)",
        borderColor: "oklch(0.72 0.19 62 / 0.5)",
        background: "oklch(0.72 0.19 62 / 0.15)",
        border: "1px solid oklch(0.72 0.19 62 / 0.5)",
      },
      triple: {
        color: "oklch(0.7 0.15 300)",
        borderColor: "oklch(0.7 0.15 300 / 0.5)",
        background: "oklch(0.7 0.15 300 / 0.15)",
        border: "1px solid oklch(0.7 0.15 300 / 0.5)",
      },
      firstBlood: {
        color: theme.color.error,
        background: `color-mix(in oklch, ${theme.color.error} 12%, transparent)`,
        border: `1px solid color-mix(in oklch, ${theme.color.error} 40%, transparent)`,
      },
      highestDamage: {
        color: "oklch(0.72 0.16 45)",
        background: "oklch(0.72 0.16 45 / 0.12)",
        border: "1px solid oklch(0.72 0.16 45 / 0.4)",
      },
      mostTurretDamage: {
        color: "oklch(0.68 0.12 55)",
        background: "oklch(0.68 0.12 55 / 0.12)",
        border: "1px solid oklch(0.68 0.12 55 / 0.4)",
      },
      mostDamageTaken: {
        color: "oklch(0.65 0.14 160)",
        background: "oklch(0.65 0.14 160 / 0.12)",
        border: "1px solid oklch(0.65 0.14 160 / 0.4)",
      },
      mostHealing: {
        color: "oklch(0.72 0.16 145)",
        background: "oklch(0.72 0.16 145 / 0.12)",
        border: "1px solid oklch(0.72 0.16 145 / 0.4)",
      },
      bestVision: {
        color: "oklch(0.7 0.14 240)",
        background: "oklch(0.7 0.14 240 / 0.12)",
        border: "1px solid oklch(0.7 0.14 240 / 0.4)",
      },
      mostCC: {
        color: "oklch(0.65 0.12 280)",
        background: "oklch(0.65 0.12 280 / 0.12)",
        border: "1px solid oklch(0.65 0.12 280 / 0.4)",
      },
      mostCS: {
        color: "oklch(0.7 0.14 110)",
        background: "oklch(0.7 0.14 110 / 0.12)",
        border: "1px solid oklch(0.7 0.14 110 / 0.4)",
      },
      highestKP: {
        color: "oklch(0.72 0.15 30)",
        background: "oklch(0.72 0.15 30 / 0.12)",
        border: "1px solid oklch(0.72 0.15 30 / 0.4)",
      },
      mostGold: {
        color: "oklch(0.8 0.16 90)",
        background: "oklch(0.8 0.16 90 / 0.12)",
        border: "1px solid oklch(0.8 0.16 90 / 0.4)",
      },
      bestDamageEfficiency: {
        color: "oklch(0.7 0.14 200)",
        background: "oklch(0.7 0.14 200 / 0.12)",
        border: "1px solid oklch(0.7 0.14 200 / 0.4)",
      },
      mvp: {
        color: "oklch(0.85 0.18 85)",
        background: "oklch(0.85 0.18 85 / 0.12)",
        border: "1px solid oklch(0.85 0.18 85 / 0.4)",
      },
      ace: {
        color: "oklch(0.7 0.18 280)",
        background: "oklch(0.7 0.18 280 / 0.12)",
        border: "1px solid oklch(0.7 0.18 280 / 0.4)",
      },
      soloKill: {
        color: "oklch(0.78 0.17 35)",
        background: "oklch(0.78 0.17 35 / 0.12)",
        border: "1px solid oklch(0.78 0.17 35 / 0.4)",
      },
    },
  },
});

export const soloKillContent = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

export const soloKillCount = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
});

export const soloKillMultiply = style({
  lineHeight: 1,
});

export const soloKillNumber = style({
  display: "inline-block",
  lineHeight: 1,
  transform: "translateY(-0.02em)",
});

export const tooltipPositioner = style({});

export const tooltipContent = style({
  zIndex: layers.overlay.tooltip,
  borderRadius: 8,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  padding: "4px 8px",
  fontSize: "0.6875rem",
  maxWidth: 240,
});
