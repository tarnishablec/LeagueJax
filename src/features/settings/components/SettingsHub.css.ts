import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gap: 16,
  alignContent: "start",
});

export const title = style({
  fontSize: "1.125rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const sections = style({
  display: "grid",
  gap: 12,
});

export const pageTabs = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  alignItems: "center",
  gap: 12,
});

export const pageTabsLeft = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  gap: 8,
  justifyContent: "start",
  minWidth: 0,
});

const pageTabBase = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: 8,
  padding: "6px 12px",
  color: vars.color.mutedForeground,
  textDecoration: "none",
  fontSize: "0.875rem",
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
      borderColor: vars.color.primary,
    },
  },
});

export const pageTab = pageTabBase;

export const pageTabActive = style([
  pageTabBase,
  {
    color: vars.color.foreground,
    borderColor: vars.color.primary,
    background: vars.color.accent,
  },
]);
