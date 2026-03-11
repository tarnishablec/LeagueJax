import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const page = style({
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 16,
  height: "100%",
});

export const summaryBar = style({
  display: "grid",
  gridTemplateColumns: "48px 1fr",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderRadius: 8,
  background: vars.color.accent,
});

export const summonerName = style({
  fontSize: "1rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const summonerLevel = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const matchList = style({
  display: "grid",
  gap: 8,
  alignContent: "start",
  overflowY: "auto",
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  height: "100%",
  color: vars.color.mutedForeground,
  fontSize: "0.875rem",
});
