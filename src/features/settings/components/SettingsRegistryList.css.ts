import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

const columnsWithCurrentLanguage =
  "minmax(20rem, 2fr) minmax(10rem, 1fr) minmax(10rem, 1fr) 6rem";
const columnsWithoutCurrentLanguage =
  "minmax(20rem, 2fr) minmax(10rem, 1fr) 6rem";

export const card = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: 10,
  background: vars.color.background,
  overflow: "hidden",
});

export const header = style({
  display: "grid",
  gap: 10,
  padding: "10px 12px",
  borderBottom: `1px solid ${vars.color.border}`,
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
});

export const headerWithCurrentLanguage = style({
  gridTemplateColumns: columnsWithCurrentLanguage,
});

export const headerWithoutCurrentLanguage = style({
  gridTemplateColumns: columnsWithoutCurrentLanguage,
});

export const row = style({
  display: "grid",
  gap: 10,
  padding: "10px 12px",
  borderBottom: `1px solid ${vars.color.border}`,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
    "&:hover": {
      background: vars.color.accent,
    },
  },
});

export const rowWithCurrentLanguage = style({
  gridTemplateColumns: columnsWithCurrentLanguage,
});

export const rowWithoutCurrentLanguage = style({
  gridTemplateColumns: columnsWithoutCurrentLanguage,
});

export const keyCell = style({
  display: "grid",
  alignItems: "center",
  gridAutoFlow: "column",
  justifyContent: "space-between",
  paddingRight: "1rem",
});

export const key = style({
  color: vars.color.foreground,
  fontSize: "0.8125rem",
  wordBreak: "break-all",
});

export const copyButton = style({
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  width: 18,
  height: 18,
  border: "none",
  background: "none",
  color: vars.color.mutedForeground,
  cursor: "pointer",
  borderRadius: 4,
  opacity: 0,
  selectors: {
    [`${row}:hover &`]: {
      opacity: 1,
    },
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.accent,
    },
  },
});

export const text = style({
  color: vars.color.mutedForeground,
  fontSize: "0.8125rem",
});

export const scope = style({
  color: vars.color.mutedForeground,
  fontSize: "0.75rem",
  textTransform: "uppercase",
});
