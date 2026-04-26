import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const page = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 16,
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  padding: "12px",
  paddingTop: 4,
});

export const outlet = style({
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "auto",
  alignContent: "start",
  height: "100%",
});

export const title = style({
  fontSize: "1.125rem",
  fontWeight: 600,
  color: vars.color.foreground,
});

export const sections = style({
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  "@media": {
    "(max-width: 1200px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const pageTabs = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  "@media": {
    "(max-width: 900px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      alignItems: "start",
      gap: 6,
    },
  },
});

export const primaryTabsRoot = style({
  display: "grid",
  minWidth: 0,
});

export const primaryTabsList = style({
  position: "relative",
  display: "flex",
  gap: 2,
  alignItems: "end",
  minWidth: 0,
  minHeight: 34,
  overflowX: "auto",
  overflowY: "hidden",
  borderBottom: `1px solid ${vars.color.border}`,
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
});

export const primaryTab = style({
  display: "grid",
  flex: "0 0 auto",
  placeItems: "center",
  minHeight: 32,
  border: "none",
  borderRadius: "6px 6px 0 0",
  padding: "0 12px",
  color: vars.color.mutedForeground,
  textDecoration: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.875rem",
  lineHeight: 1,
  whiteSpace: "nowrap",
  transition: "color 120ms ease-out, background 120ms ease-out",
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.accent,
    },
    "&[data-selected]": {
      color: vars.color.foreground,
    },
    "&:focus-visible": {
      outline: `1px solid ${vars.color.primary}`,
      outlineOffset: -1,
    },
  },
});

export const primaryTabsIndicator = style({
  bottom: -1,
  height: 2,
  width: "var(--width)",
  borderRadius: 999,
  background: vars.color.primary,
});

export const utilityTabsRoot = style({
  display: "grid",
  minWidth: 0,
  justifySelf: "end",
  "@media": {
    "(max-width: 900px)": {
      width: "100%",
      justifySelf: "stretch",
    },
  },
});

export const utilityTabsList = style([
  primaryTabsList,
  {
    maxWidth: "100%",
    "@media": {
      "(max-width: 900px)": {
        justifyContent: "end",
      },
    },
  },
]);

export const utilityTabsIndicator = style([
  primaryTabsIndicator,
  {
    background: vars.color.primary,
  },
]);
