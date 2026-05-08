import { globalStyle, style } from "@vanilla-extract/css";
import { row as settingsFieldRow } from "@/components/settings-ui/SettingsFieldRow.css";
import { theme } from "@/styles/theme.css";

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
  width: "52px",
  height: "52px",
  color: theme.color.primary,
});

export const meta = style({
  display: "grid",
  justifyItems: "center",
  gap: "4px",
  textAlign: "center",
});

export const queueName = style({
  fontSize: "19px",
  lineHeight: 1.15,
  fontWeight: 700,
  color: theme.color.foreground,
  textWrap: "balance",
});

export const phase = style({
  fontSize: "13px",
  lineHeight: 1.35,
  color: theme.color.primary,
});

export const autoAcceptCountdown = style({
  fontSize: "12px",
  lineHeight: 1.35,
  color: theme.color.success,
});

export const footer = style({
  display: "grid",
  gap: "8px",
  padding: "8px",
  borderRadius: "8px",
  background: "oklch(0 0 0 / 0.16)",
  border: "1px solid oklch(1 0 0 / 0.06)",
});


globalStyle(`${footer} ${settingsFieldRow}`, {
  gridTemplateColumns: "13rem minmax(0, 1fr)",
});