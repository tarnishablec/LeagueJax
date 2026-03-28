import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const wrapper = style({
  display: "grid",
  alignItems: "center",
  paddingInline: 8,
});

export const triggerButton = style({
  height: 30,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.75rem",
  paddingInline: 10,
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
  },
});

export const dialogBackdrop = style({
  position: "fixed",
  inset: 0,
  background: "oklch(0.06 0 0 / 0.62)",
  zIndex: 40,
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
});

export const dialogPositioner = style({
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 20,
  zIndex: 41,
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
});

export const dialogContent = style({
  width: "min(780px, calc(100vw - 40px))",
  minHeight: "min(520px, calc(100vh - 40px))",
  maxHeight: "calc(100vh - 40px)",
  borderRadius: 12,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popover,
  color: vars.color.foreground,
  boxShadow: `0 16px 36px ${vars.settings.selectMenuShadow}`,
  padding: 14,
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 10,
});

export const headerRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "start",
  gap: 10,
});

export const headerText = style({
  display: "grid",
  gap: 3,
});

export const title = style({
  margin: 0,
  fontSize: "0.9rem",
  fontWeight: 700,
  color: vars.color.foreground,
});

export const subtitle = style({
  margin: 0,
  fontSize: "0.74rem",
  color: vars.color.mutedForeground,
});

export const closeButton = style({
  width: 26,
  height: 26,
  borderRadius: 7,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
  },
});

export const searchRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(190px, 220px) minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
});

export const searchRowNoServer = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
});

export const searchInput = style({
  width: "100%",
  height: 32,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.8rem",
  paddingInline: 10,
  outline: "none",
  selectors: {
    "&::placeholder": {
      color: vars.color.mutedForeground,
    },
    "&:focus": {
      borderColor: vars.color.primary,
    },
  },
});

export const searchButton = style({
  height: 32,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.75rem",
  paddingInline: 12,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
    "&:disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
});

export const metaRow = style({
  display: "grid",
  minHeight: 18,
  alignItems: "center",
  paddingLeft: "0.5rem",
});

export const metaText = style({
  fontSize: "0.72rem",
  color: vars.color.mutedForeground,
});

export const errorText = style({
  fontSize: "0.72rem",
  color: "oklch(0.67 0.2 29)",
});

export const resultPanel = style({
  display: "grid",
  placeItems: "center",
  borderRadius: 10,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  minHeight: 0,
  overflow: "auto",
  padding: 8,
});

export const resultList = style({
  display: "grid",
  width: "100%",
  height: "100%",
  alignContent: "start",
  gap: 6,
});

export const resultButton = style({
  width: "100%",
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
  color: vars.color.foreground,
  font: "inherit",
  padding: "8px 10px",
  cursor: "pointer",
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr)",
  gridTemplateRows: "auto auto",
  columnGap: 10,
  rowGap: 3,
  alignItems: "center",
  textAlign: "left",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: vars.color.background,
    },
  },
});

export const resultAvatar = style({
  width: 35,
  height: 35,
  borderRadius: 6,
  objectFit: "cover",
  gridRow: "1 / -1",
  border: `1px solid ${vars.color.border}`,
});

export const resultAvatarFallback = style({
  width: 35,
  height: 35,
  borderRadius: 6,
  gridRow: "1 / -1",
  background: vars.color.border,
});

export const resultName = style({
  fontSize: "0.79rem",
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const resultMeta = style({
  fontSize: "0.7rem",
  color: vars.color.mutedForeground,
  display: "inline-grid",
  gridAutoFlow: "column",
  justifyContent: "space-between",
  gap: 12,
});

export const emptyText = style({
  fontSize: "0.75rem",
  color: vars.color.mutedForeground,
  display: "grid",
  placeItems: "center",
  minHeight: 80,
});
