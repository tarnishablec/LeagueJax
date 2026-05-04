import { globalStyle, style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gap: 12,
  alignContent: "start",
});

export const overviewCard = style({
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 10,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.blurry,
});

export const overview = style({
  display: "grid",
  gridTemplateColumns: "15rem minmax(0, 1fr)",
  gap: 16,
  alignItems: "center",
  "@media": {
    "(max-width: 800px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const logoPanel = style({
  display: "grid",
  placeItems: "center",
  minHeight: "7rem",
  borderRadius: "14px",
});

export const markdownShell = style({
  display: "grid",
  gap: 10,
});

globalStyle(`${markdownShell} h1`, {
  margin: 0,
  fontSize: "1.52rem",
  lineHeight: 1.12,
  fontWeight: "700",
  color: theme.color.foreground,
});

globalStyle(`${markdownShell} p`, {
  margin: 0,
  color: theme.color.foreground,
  fontSize: "0.95rem",
  lineHeight: "1.65",
});

export const versionPill = style({
  display: "inline-grid",
  placeItems: "center",
  minHeight: "1.2rem",
  lineHeight: 1,
  marginInline: "0.34rem 0.42rem",
  paddingInline: 10,
  borderRadius: 999,
  border: `1px solid oklch(from ${theme.color.primary} l c h / 0.28)`,
  background: `oklch(from ${theme.color.primary} l c h / 0.12)`,
  color: theme.color.primary,
  fontSize: "0.8rem",
  fontWeight: "600",
  letterSpacing: "0.02em",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
});

export const referenceRow = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  gap: 8,
  alignItems: "center",
  justifyContent: "start",
  color: theme.color.mutedForeground,
  fontSize: "0.86rem",
  lineHeight: "1.55",
});

export const referenceLabel = style({
  color: theme.color.mutedForeground,
});

export const markdownLink = style({
  padding: 0,
  border: 0,
  background: "transparent",
  font: "inherit",
  display: "inline-block",
  color: theme.color.primary,
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
    "&:hover": {
      textDecoration: "underline",
    },
  },
});

globalStyle(`${referenceRow} ${markdownLink}`, {
  color: theme.color.mutedForeground,
});

globalStyle(`${referenceRow} ${markdownLink}:hover`, {
  color: theme.color.foreground,
});

export const markdownImage = style({
  display: "block",
  height: 20,
  width: "auto",
  borderRadius: 999,
  overflow: "hidden",
});

export const contentGrid = style({
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr",
});

export const sectionText = style({
  margin: 0,
  color: theme.color.mutedForeground,
  fontSize: "0.92rem",
  lineHeight: 1.6,
});

export const softwareList = style({
  display: "grid",
  gap: 10,
});

export const softwareItem = style({
  appearance: "none",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  gap: 12,
  alignItems: "start",
  width: "100%",
  padding: 12,
  font: "inherit",
  borderRadius: 10,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.surface,
  color: "inherit",
  textAlign: "left",
  cursor: "pointer",
  transition:
    "border-color 140ms ease, background-color 140ms ease, transform 140ms ease",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
    "&:hover": {
      borderColor: `oklch(from ${theme.color.primary} l c h / 0.44)`,
      background: `oklch(from ${theme.color.primary} l c h / 0.1)`,
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0)",
    },
  },
  "@media": {
    "(max-width: 760px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const softwareBody = style({
  display: "grid",
  gap: 4,
});

export const softwareName = style({
  fontSize: "0.98rem",
  fontWeight: 600,
  color: theme.color.foreground,
  transition: "color 140ms ease",
  selectors: {
    [`${softwareItem}:hover &`]: {
      color: theme.color.primary,
    },
  },
});

export const softwareRole = style({
  color: theme.color.mutedForeground,
  fontSize: "0.88rem",
  lineHeight: 1.5,
});

export const softwareMeta = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  placeItems: "center",
  gap: 8,
  justifyContent: "start",
  alignSelf: "center",
});

export const softwarePill = style({
  display: "inline-grid",
  placeItems: "center",
  paddingInline: 10,
  borderRadius: 999,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.blurry,
  color: theme.color.foreground,
  fontSize: "0.8rem",
  lineHeight: 1,
  minHeight: "1.5rem",
  whiteSpace: "nowrap",
});
