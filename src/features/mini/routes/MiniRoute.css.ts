import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  gridTemplateRows: "1fr auto",
  height: "100%",
  padding: "18px 16px 14px",
  gap: "14px",
});

export const hero = style({
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "12px",
  padding: "8px",
  borderRadius: "22px",
  minHeight: 0,
});

export const mapIconFrame = style({
  display: "grid",
  placeItems: "center",
  width: "84px",
  height: "84px",
  borderRadius: "24px",
  overflow: "hidden",
  background: `transparent`,
});

export const mapImage = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const mapFallback = style({
  color: vars.color.primary,
});

export const meta = style({
  display: "grid",
  justifyItems: "center",
  gap: "4px",
  textAlign: "center",
});

export const scene = style({
  fontSize: "11px",
  lineHeight: 1.2,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: vars.color.mutedForeground,
});

export const mode = style({
  fontSize: "19px",
  lineHeight: 1.15,
  fontWeight: 700,
  color: vars.color.foreground,
  textWrap: "balance",
});

export const phase = style({
  fontSize: "13px",
  lineHeight: 1.35,
  color: vars.color.primary,
});

export const mapName = style({
  fontSize: "12px",
  lineHeight: 1.3,
  color: vars.color.mutedForeground,
});

export const footer = style({
  display: "grid",
  gap: "4px",
  padding: "10px 12px",
  borderRadius: "16px",
  background: `oklch(from ${vars.color.surface} l c h / 0.9)`,
  border: `1px solid ${vars.color.border}`,
});

export const footerLabel = style({
  fontSize: "10px",
  lineHeight: 1.2,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: vars.color.mutedForeground,
});

export const footerValue = style({
  fontSize: "13px",
  lineHeight: 1.35,
  color: vars.color.foreground,
});
