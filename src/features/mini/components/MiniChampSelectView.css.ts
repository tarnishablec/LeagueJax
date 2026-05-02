import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

const panelBackground = "oklch(0 0 0 / 0.12)";

export const root = style({
  display: "grid",
  gridTemplateRows: "auto auto 1fr auto",
  height: "100%",
  minHeight: 0,
  gap: "8px",
  padding: "12px",
  overflow: "hidden",
});

export const benchPanel = style({
  display: "grid",
  gridTemplateColumns: "82px 1fr",
  alignItems: "center",
  minHeight: "112px",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1px solid ${vars.color.border}`,
  background: panelBackground,
});

export const defaultPanel = style({
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  minHeight: "142px",
  gap: "8px",
  padding: "14px 12px",
  borderRadius: "8px",
  border: `1px solid ${vars.color.border}`,
  background: panelBackground,
});

export const selectedColumn = style({
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "6px",
  minWidth: 0,
});

export const selectedChampionImage = style({
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  border: "1px solid color-mix(in oklch, rgb(245 130 0) 36%, transparent)",
  boxShadow: "0 0 0 3px oklch(0 0 0 / 0.18)",
  background: "oklch(1 0 0 / 0.06)",
});

globalStyle(`${selectedChampionImage} img`, {
  objectFit: "cover",
  objectPosition: "center",
  transform: "scale(1.12)",
  transformOrigin: "center",
});

export const selectedChampionFallback = style({
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  border: `1px solid ${vars.color.border}`,
  background: "oklch(1 0 0 / 0.06)",
});

export const selectedLabel = style({
  display: "grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: "5px",
  maxWidth: "100%",
  fontSize: "12px",
  lineHeight: 1.25,
  color: vars.color.mutedForeground,
});

export const benchGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, 42px)",
  gridAutoRows: "42px",
  alignContent: "center",
  justifyContent: "start",
  gap: "6px",
  minWidth: 0,
});

export const benchChampionButton = style({
  position: "relative",
  display: "grid",
  placeItems: "center",
  width: "42px",
  height: "42px",
  padding: 0,
  borderRadius: "6px",
  border: `1px solid ${vars.color.border}`,
  background: "oklch(1 0 0 / 0.04)",
  overflow: "hidden",
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: "color-mix(in oklch, rgb(245 130 0) 52%, transparent)",
      background: "oklch(1 0 0 / 0.08)",
    },
    '&[data-current="true"]': {
      borderColor: vars.color.primary,
      cursor: "default",
      opacity: 0.58,
    },
    '&[data-pending="true"]::after': {
      content: "",
      position: "absolute",
      inset: 0,
      background: "oklch(0 0 0 / 0.42)",
    },
    "&:disabled": {
      cursor: "default",
    },
    '&[data-unpickable="true"]': {
      cursor: "not-allowed",
      opacity: 0.46,
      filter: "grayscale(0.85)",
    },
  },
});

export const benchChampionImage = style({
  width: "40px",
  height: "40px",
  borderRadius: "5px",
  background: "oklch(1 0 0 / 0.05)",
});

export const benchChampionFallback = style({
  width: "40px",
  height: "40px",
  borderRadius: "5px",
  background: "oklch(1 0 0 / 0.05)",
});

export const statusPanel = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "center",
  gap: "10px",
  minHeight: "58px",
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1px solid ${vars.color.border}`,
  background: panelBackground,
});

export const phaseDot = style({
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  border: `3px solid ${vars.color.primary}`,
  background: "transparent",
});

export const statusText = style({
  display: "grid",
  minWidth: 0,
  gap: "4px",
});

export const statusTitle = style({
  fontSize: "13px",
  lineHeight: 1.25,
  fontWeight: 700,
  color: vars.color.foreground,
});

export const statusMeta = style({
  fontSize: "12px",
  lineHeight: 1.3,
  color: vars.color.mutedForeground,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const spacer = style({
  minHeight: 0,
});
