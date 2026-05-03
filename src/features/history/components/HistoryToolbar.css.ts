import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import { root as iconActionButton } from "@/components/IconActionButton.css";
import { vars } from "@/styles/theme.css";

const searchButtonWidth = "80px";

const spin = keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

export const wrapper = style({
  display: "grid",
  alignItems: "center",
  paddingInline: 8,
});

export const triggerButton = style([iconActionButton]);

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
  width: "min(940px, calc(100vw - 40px))",
  minHeight: "min(520px, calc(100vh - 40px))",
  maxHeight: "70vh",
  borderRadius: 12,
  border: `1px solid ${vars.color.popoverBorder}`,
  background: vars.color.popupBackground,
  color: vars.color.foreground,
  boxShadow: `0 16px 36px oklch(from ${vars.color.foreground} 0.25 c h / 0.2)`,
  padding: 14,
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 10,
  selectors: {
    ":root.dark &": {
      boxShadow: `0 16px 36px oklch(from ${vars.color.background} 0.06 c h / 0.6)`,
    },
  },
});

export const contentGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 260px)",
  gap: 10,
  minHeight: 0,
  "@media": {
    "screen and (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gridTemplateRows: "minmax(220px, 1fr) minmax(180px, 240px)",
    },
  },
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
  gridTemplateColumns: `minmax(190px, 220px) minmax(0, 1fr) ${searchButtonWidth}`,
  gap: 8,
  alignItems: "center",
});

export const searchRowNoServer = style({
  display: "grid",
  gridTemplateColumns: `minmax(0, 1fr) ${searchButtonWidth}`,
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
  position: "relative",
  display: "inline-grid",
  placeItems: "center",
  width: searchButtonWidth,
  height: 32,
  borderRadius: 8,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.accent,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.75rem",
  paddingInline: 0,
  cursor: "pointer",
  userSelect: "none",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
    },
    "&:disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    "&[data-loading='true']": {
      cursor: "wait",
    },
  },
});

export const searchButtonLabel = style({
  gridArea: "1 / 1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  transition: "opacity 180ms ease-in-out",
});

export const searchButtonLabelHidden = style({
  opacity: 0,
});

export const searchButtonLoader = style({
  gridArea: "1 / 1",
  display: "inline-grid",
  placeItems: "center",
  opacity: 0,
  transform: "scale(0.88)",
  transition: "opacity 180ms ease-in-out, transform 180ms ease-in-out",
  pointerEvents: "none",
});

export const searchButtonLoaderVisible = style({
  opacity: 1,
  transform: "scale(1)",
});

export const searchButtonIconSpin = style({
  animation: `${spin} 900ms linear infinite`,
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

export const friendPanel = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  minHeight: 0,
  borderRadius: 10,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.background,
  overflow: "hidden",
});

export const friendHeader = style({
  display: "grid",
  gridTemplateColumns: "minmax(58px, 0.72fr) minmax(86px, 1fr) auto",
  alignItems: "center",
  gap: 6,
  padding: "9px 10px",
  borderBottom: `1px solid ${vars.color.border}`,
});

export const friendHeaderText = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const friendTitle = style({
  fontSize: "0.78rem",
  fontWeight: 700,
  color: vars.color.foreground,
});

export const friendCount = style({
  fontSize: "0.68rem",
  color: vars.color.mutedForeground,
});

export const friendSearchInput = style({
  width: "100%",
  minWidth: 0,
  height: 30,
  borderRadius: 6,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.popupBackground,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: "0.68rem",
  paddingInline: 7,
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

export const friendList = style({
  display: "grid",
  alignContent: "start",
  gap: 9,
  minHeight: 0,
  overflow: "auto",
  padding: 8,
});

export const friendSection = style({
  display: "grid",
  gap: 5,
});

export const friendSectionTitle = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 8,
  paddingInline: 2,
  fontSize: "0.68rem",
  fontWeight: 700,
  color: vars.color.mutedForeground,
});

export const friendButton = style({
  width: "100%",
  borderRadius: 8,
  border: `1px solid transparent`,
  background: "transparent",
  color: vars.color.foreground,
  font: "inherit",
  padding: "6px 7px",
  cursor: "pointer",
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  textAlign: "left",
  selectors: {
    "&:hover": {
      borderColor: vars.color.border,
      background: vars.color.accent,
    },
  },
});

export const friendAvatar = style({
  width: 28,
  height: 28,
  borderRadius: 6,
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

export const friendAvatarFallback = style({
  width: 28,
  height: 28,
  borderRadius: 6,
  background: vars.color.border,
});

export const friendInfo = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const friendName = style({
  fontSize: "0.74rem",
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const friendMeta = style({
  display: "block",
  fontSize: "0.66rem",
  lineHeight: 1.2,
  minHeight: "0.8rem",
  color: vars.color.mutedForeground,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const friendStatusBase = style({
  borderRadius: 999,
  border: `1px solid ${vars.color.border}`,
  padding: "2px 6px",
  fontSize: "0.63rem",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
});

export const friendStatus = styleVariants({
  online: [
    friendStatusBase,
    {
      color: "oklch(0.72 0.15 150)",
      background: "oklch(0.72 0.15 150 / 0.1)",
      borderColor: "oklch(0.72 0.15 150 / 0.28)",
    },
  ],
  inGame: [
    friendStatusBase,
    {
      color: "#16cae5",
      background: "oklch(from #16cae5 l c h / 0.12)",
      borderColor: "oklch(from #16cae5 l c h / 0.32)",
    },
  ],
  away: [
    friendStatusBase,
    {
      color: "oklch(0.76 0.13 78)",
      background: "oklch(0.76 0.13 78 / 0.1)",
      borderColor: "oklch(0.76 0.13 78 / 0.28)",
    },
  ],
  offline: [
    friendStatusBase,
    {
      color: vars.color.mutedForeground,
      background: vars.color.accent,
    },
  ],
});

export const friendEmptyText = style({
  // minHeight: 80,
  height: "100%",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: 8,
  fontSize: "0.72rem",
  color: vars.color.mutedForeground,
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
