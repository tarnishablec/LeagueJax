import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gridTemplateRows: "1fr",
  gap: 16,
  height: "100%",
});

export const statusCard = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 12,
  padding: 12,
  background: vars.color.accent,
  "@media": {
    "(max-width: 860px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const statusItem = style({
  display: "grid",
  gap: 4,
});

export const statusLabel = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const statusValue = style({
  fontSize: "0.875rem",
  color: vars.color.foreground,
  fontWeight: 600,
});

export const teamsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  minHeight: 0,
  "@media": {
    "(max-width: 1200px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const teamPanel = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 8,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 12,
  padding: 12,
  minHeight: 0,
});

export const teamTitle = style({
  fontSize: "0.9rem",
  fontWeight: 700,
  color: vars.color.foreground,
});

export const playerList = style({
  display: "grid",
  alignContent: "start",
  gap: 8,
  overflow: "auto",
  minHeight: 0,
});

export const emptyState = style({
  display: "grid",
  placeItems: "center",
  minHeight: 120,
  color: vars.color.mutedForeground,
  fontSize: "0.8rem",
  border: `1px dashed ${vars.color.border}`,
  borderRadius: 8,
});

export const playerCard = style({
  display: "grid",
  gap: 6,
  border: `1px solid ${vars.color.border}`,
  borderRadius: 8,
  padding: 10,
  background: vars.color.accent,
});

export const playerName = style({
  fontWeight: 700,
  fontSize: "0.85rem",
  color: vars.color.foreground,
});

export const playerMeta = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 4,
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
});

export const playerStats = style({
  fontSize: "0.78rem",
  color: vars.color.foreground,
});
