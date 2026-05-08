import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { gameColorVars } from "@/styles/game-colors.css.ts";
import { theme } from "@/styles/theme.css.ts";

export const participantPicker = style({
  minWidth: 0,
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
  overflowX: "auto",
  padding: "2px",
});

export const participantTrigger = recipe({
  base: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    border: "none",
    borderRadius: 8,
    padding: 2,
    background: `color-mix(in srgb, ${theme.color.surface} 66%, transparent)`,
    outline: `1px solid ${theme.color.border}`,
    cursor: "pointer",
    transition: "background 140ms, color 140ms, outline-color 140ms",
    selectors: {
      "&:hover": {
        background: theme.color.accent,
        outlineColor: theme.color.primary,
      },
      "&[data-state='on']": {
        background: `color-mix(in srgb, ${theme.color.accent} 72%, transparent)`,
      },
      "&:focus-visible": {
        outline: `2px solid ${theme.color.primary}`,
        outlineOffset: 2,
      },
    },
  },
  variants: {
    team: {
      blue: {
        selectors: {
          "&[data-state='on']": {
            outlineColor: gameColorVars.team.blueAccent,
          },
        },
      },
      red: {
        selectors: {
          "&[data-state='on']": {
            outlineColor: gameColorVars.team.redAccent,
          },
        },
      },
      neutral: {},
    },
  },
});

export const participantChampionIcon = style({
  width: 32,
  height: 32,
  borderRadius: 7,
  objectFit: "cover",
  outline: `1px solid color-mix(in srgb, ${theme.color.border} 78%, transparent)`,
});

export const participantChampionFallback = style({
  width: 32,
  height: 32,
  borderRadius: 7,
  background: theme.color.accent,
});

export const selectedHeader = style({
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
});

export const selectedChampionIcon = style({
  width: 36,
  height: 36,
  borderRadius: 8,
  objectFit: "cover",
  outline: `1px solid ${theme.color.border}`,
});

export const selectedChampionFallback = style({
  width: 36,
  height: 36,
  borderRadius: 8,
  background: theme.color.accent,
});

export const selectedText = style({
  minWidth: 0,
  display: "grid",
  gap: 4,
});

export const selectedName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.foreground,
  fontSize: "0.875rem",
  fontWeight: 750,
  lineHeight: 1,
});

export const selectedChampionName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 650,
  lineHeight: 1,
});
