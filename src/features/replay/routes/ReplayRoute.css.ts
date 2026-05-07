import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import { gameColorVars } from "@/styles/game-colors.css.ts";
import { theme } from "@/styles/theme.css.ts";

const pagePadding = "16px";

const spinKeyframes = keyframes({
  to: {
    transform: "rotate(360deg)",
  },
});

const appearInKeyframes = keyframes({
  from: {
    opacity: 0,
    transform: "translateY(4px)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0)",
  },
});

export const root = style({
  height: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateRows: "max-content minmax(0, 1fr)",
  gap: 12,
  overflowX: "hidden",
  padding: pagePadding,
  boxSizing: "border-box",
});

export const header = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  alignItems: "center",
  gap: 16,
});

export const titleGroup = style({
  minWidth: 0,
  display: "grid",
  gap: 4,
});

// export const title = style({
//   margin: 0,
//   color: theme.color.foreground,
//   fontSize: "1.25rem",
//   lineHeight: 1.1,
// });

export const subtitle = style({
  color: theme.color.mutedForeground,
  fontSize: "0.8125rem",
  lineHeight: 1.3,
});

export const scanButton = style({
  height: 32,
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  alignItems: "center",
  gap: 6,
  border: "none",
  borderRadius: 6,
  padding: "0 12px",
  background: `color-mix(in srgb, ${theme.color.primary} 72%, transparent)`,
  color: theme.color.foreground,
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.55,
      cursor: "not-allowed",
    },
    "&:hover:not(:disabled)": {
      background: `color-mix(in srgb, ${theme.color.primary} 86%, transparent)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
  },
});

export const scanButtonTooltipTrigger = style({
  display: "inline-grid",
});

export const spin = style({
  animation: `${spinKeyframes} 900ms linear infinite`,
});

export const appearIn = style({
  animation: `${appearInKeyframes} 180ms ease-out both`,
  transition: "opacity 180ms ease-out, transform 180ms ease-out",
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
      transition: "none",
    },
  },
});

export const layout = style({
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)",
  gap: 12,
  "@media": {
    "screen and (max-width: 980px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const side = style({
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  alignContent: "start",
  gap: 12,
});

export const panel = style({
  minWidth: 0,
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 68%, transparent)`,
});

export const panelTitle = style({
  color: theme.color.foreground,
  fontSize: "0.8125rem",
  fontWeight: 800,
  lineHeight: 1,
});

export const directoryDropzone = style({
  minHeight: 74,
  borderRadius: 8,
  outline: `1px dashed ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.deep} 34%, transparent)`,
  transition: "background 140ms, outline-color 140ms",
  selectors: {
    "&:hover": {
      outlineColor: `color-mix(in srgb, ${theme.color.primary} 48%, ${theme.color.border})`,
      background: `color-mix(in srgb, ${theme.color.deep} 48%, transparent)`,
    },
    "&[data-dragging]": {
      outlineColor: theme.color.primary,
      background: `color-mix(in srgb, ${theme.color.primary} 16%, transparent)`,
    },
  },
});

export const directoryTrigger = style({
  width: "100%",
  minHeight: 74,
  boxSizing: "border-box",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: 6,
  border: "none",
  borderRadius: 8,
  padding: 12,
  background: "transparent",
  color: theme.color.foreground,
  textAlign: "center",
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.55,
      cursor: "not-allowed",
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: -2,
    },
  },
});

export const dropzoneText = style({
  minWidth: 0,
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  lineHeight: 1.3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const input = style({
  minWidth: 0,
  height: 30,
  boxSizing: "border-box",
  border: "none",
  borderRadius: 6,
  outline: `1px solid ${theme.color.border}`,
  padding: "0 10px",
  background: `color-mix(in srgb, ${theme.color.deep} 42%, transparent)`,
  color: theme.color.foreground,
  fontSize: "0.75rem",
  selectors: {
    "&:focus": {
      outline: `2px solid ${theme.color.primary}`,
    },
  },
});

export const smallButton = style({
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  border: "none",
  borderRadius: 6,
  padding: "0 10px",
  background: `color-mix(in srgb, ${theme.color.accent} 72%, transparent)`,
  color: theme.color.foreground,
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.55,
      cursor: "not-allowed",
    },
    "&:hover:not(:disabled)": {
      background: `color-mix(in srgb, ${theme.color.primary} 58%, transparent)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
  },
});

export const stack = style({
  display: "grid",
  gap: 6,
});

export const resourceRow = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 40px",
  alignItems: "center",
  gap: 12,
  padding: "7px 8px",
  borderRadius: 6,
  outline: "1px solid transparent",
  background: `color-mix(in srgb, ${theme.color.surface} 52%, transparent)`,
  transition:
    "background 140ms, outline-color 140ms, opacity 180ms ease-out, transform 180ms ease-out",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${theme.color.surface} 72%, transparent)`,
      outlineColor: theme.color.border,
    },
  },
});

export const executableRow = style({
  gridTemplateColumns: "minmax(0, 1fr) max-content",
});

export const loadingStatusRow = style({
  minWidth: 0,
  minHeight: 40,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "max-content minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 6,
  outline: "1px solid transparent",
  background: `color-mix(in srgb, ${theme.color.surface} 52%, transparent)`,
});

export const loadingStatusIcon = style({
  width: 16,
  height: 16,
  display: "grid",
  color: theme.color.primary,
});

export const loadingLabel = style({
  minWidth: 0,
  color: theme.color.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const resourceText = style({
  minWidth: 0,
  display: "grid",
  gap: 3,
});

export const directoryText = style([
  resourceText,
  {
    justifyItems: "center",
  },
]);

export const resourceClientMain = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
});

export const resourceTitleLine = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "max-content minmax(0, 1fr)",
  alignItems: "center",
  gap: 6,
});

export const folderOpenButton = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
  border: "none",
  padding: 0,
  background: "transparent",
  color: "inherit",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.65,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
      borderRadius: 4,
    },
  },
});

export const executableOpenButton = style([
  resourceRow,
  executableRow,
  {
    width: "100%",
    border: "none",
    color: "inherit",
    font: "inherit",
    textAlign: "left",
    cursor: "pointer",
    selectors: {
      "&:disabled": {
        cursor: "not-allowed",
        opacity: 0.65,
      },
      "&:focus-visible": {
        outline: `2px solid ${theme.color.primary}`,
        outlineOffset: 2,
      },
    },
  },
]);

export const resourceIconSlot = style({
  width: 24,
  height: 24,
  display: "grid",
  placeItems: "center",
  color: theme.color.mutedForeground,
});

export const resourceActionSlot = style({
  width: 40,
  height: 40,
});

export const primaryText = style({
  minWidth: 0,
  color: theme.color.foreground,
  fontSize: "0.75rem",
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: "color 140ms",
  selectors: {
    [`${folderOpenButton}:hover:not(:disabled) &`]: {
      color: theme.color.primary,
    },
    [`${executableOpenButton}:hover:not(:disabled) &`]: {
      color: theme.color.primary,
    },
  },
});

export const mutedText = style({
  minWidth: 0,
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const tintText = style({
  minWidth: 0,
  width: "fit-content",
  maxWidth: "100%",
  boxSizing: "border-box",
  color: theme.color.primary,
  fontSize: "0.6875rem",
  fontWeight: 800,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  borderRadius: 4,
  padding: "2px 6px",
  outline: `1px solid color-mix(in srgb, ${theme.color.primary} 36%, ${theme.color.border})`,
  background: theme.color.tint,
});

const tencentColor = gameColorVars.augmentRarity.gold;
const riotColor = gameColorVars.team.blue;

export const familyBadge = style({
  minWidth: 0,
  height: 18,
  boxSizing: "border-box",
  display: "inline-grid",
  placeItems: "center",
  borderRadius: 4,
  padding: "0 6px",
  outline: "1px solid transparent",
  fontSize: "0.625rem",
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
});

export const familyBadgeTone = styleVariants({
  tencent: {
    color: tencentColor,
    outlineColor: `color-mix(in srgb, ${tencentColor} 58%, ${theme.color.border})`,
    background: `color-mix(in srgb, ${tencentColor} 12%, transparent)`,
  },
  riot: {
    color: riotColor,
    outlineColor: `color-mix(in srgb, ${riotColor} 58%, ${theme.color.border})`,
    background: `color-mix(in srgb, ${riotColor} 12%, transparent)`,
  },
  unknown: {
    color: theme.color.mutedForeground,
    outlineColor: theme.color.border,
    background: `color-mix(in srgb, ${theme.color.deep} 34%, transparent)`,
  },
});

export const statusBadge = style({
  minWidth: 58,
  height: 22,
  boxSizing: "border-box",
  display: "inline-grid",
  placeItems: "center",
  borderRadius: 4,
  padding: "0 8px",
  outline: "1px solid transparent",
  fontSize: "0.6875rem",
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
});

export const statusBadgeTone = styleVariants({
  running: {
    color: theme.color.success,
    outlineColor: `color-mix(in srgb, ${theme.color.success} 58%, ${theme.color.border})`,
    background: `color-mix(in srgb, ${theme.color.success} 18%, transparent)`,
  },
  local: {
    color: theme.color.mutedForeground,
    outlineColor: theme.color.border,
    background: `color-mix(in srgb, ${theme.color.deep} 34%, transparent)`,
  },
});

export const clientTone = styleVariants({
  tencent: {
    outlineColor: `color-mix(in srgb, ${tencentColor} 44%, ${theme.color.border})`,
    selectors: {
      "&:hover": {
        outlineColor: `color-mix(in srgb, ${tencentColor} 68%, ${theme.color.border})`,
      },
    },
  },
  riot: {
    outlineColor: `color-mix(in srgb, ${riotColor} 44%, ${theme.color.border})`,
    selectors: {
      "&:hover": {
        outlineColor: `color-mix(in srgb, ${riotColor} 68%, ${theme.color.border})`,
      },
    },
  },
  unknown: {},
});

export const content = style({
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "max-content minmax(0, 1fr)",
  gap: 10,
});

export const searchRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
});

export const replayListScroller = style({
  minHeight: 0,
});

export const replayList = style({
  display: "grid",
  alignContent: "start",
  gap: 6,
  padding: 1,
});

export const replayRowShell = style({
  position: "relative",
  minWidth: 0,
});

export const replayRow = style({
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  alignItems: "center",
  gap: 12,
  border: "none",
  padding: 10,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 54%, transparent)`,
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  transition: "background 140ms, outline-color 140ms, transform 140ms",
  cursor: "pointer",
  selectors: {
    [`${replayRowShell}:hover &`]: {
      outlineColor: `color-mix(in srgb, ${theme.color.primary} 34%, ${theme.color.border})`,
      background: `color-mix(in srgb, ${theme.color.surface} 78%, transparent)`,
    },
    "&:hover": {
      outlineColor: `color-mix(in srgb, ${theme.color.primary} 34%, ${theme.color.border})`,
      background: `color-mix(in srgb, ${theme.color.surface} 78%, transparent)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: 2,
    },
  },
});

export const replayOpenContent = style({
  minWidth: 0,
  display: "grid",
  gap: 3,
});

export const replayTitleLine = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "max-content minmax(0, 1fr)",
  alignItems: "center",
  justifyContent: "start",
  gap: 10,
});

export const replayActionSpace = style({
  width: 40,
  height: 40,
});

export const replayPlayButton = style({
  position: "absolute",
  top: "50%",
  right: 10,
  zIndex: 1,
  transform: "translateY(-50%)",
  display: "block",
});

export const playButtonTone = styleVariants({
  tencent: {
    outline: `1px solid color-mix(in srgb, ${tencentColor} 62%, ${theme.color.border})`,
    background: `color-mix(in srgb, ${tencentColor} 22%, ${theme.color.accent})`,
    selectors: {
      "&:hover:not(:disabled)": {
        outline: `2px solid ${tencentColor}`,
        background: `color-mix(in srgb, ${tencentColor} 34%, ${theme.color.accent})`,
      },
    },
  },
  riot: {
    outline: `1px solid color-mix(in srgb, ${riotColor} 62%, ${theme.color.border})`,
    background: `color-mix(in srgb, ${riotColor} 22%, ${theme.color.accent})`,
    selectors: {
      "&:hover:not(:disabled)": {
        outline: `2px solid ${riotColor}`,
        background: `color-mix(in srgb, ${riotColor} 34%, ${theme.color.accent})`,
      },
    },
  },
  unknown: {},
});

export const replayMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 10px",
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
});

export const replayChampions = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
  marginTop: 3,
});

export const replayChampionIcon = style({
  width: 20,
  height: 20,
  borderRadius: 4,
  outline: `1px solid color-mix(in srgb, ${theme.color.border} 70%, transparent)`,
  background: `color-mix(in srgb, ${theme.color.deep} 54%, transparent)`,
  overflow: "hidden",
});

export const replayChampionFallback = style([
  replayChampionIcon,
  {
    display: "inline-block",
    background: `color-mix(in srgb, ${theme.color.surface} 78%, transparent)`,
  },
]);

export const metaItem = style({
  minWidth: 0,
  color: theme.color.mutedForeground,
  whiteSpace: "nowrap",
});

export const metaWarning = style({
  minWidth: 0,
  color: `color-mix(in srgb, ${theme.color.error} 78%, ${theme.color.foreground})`,
  cursor: "help",
  whiteSpace: "nowrap",
});

export const empty = style({
  minHeight: 160,
  display: "grid",
  placeItems: "center",
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  color: theme.color.mutedForeground,
  background: `color-mix(in srgb, ${theme.color.surface} 38%, transparent)`,
  fontSize: "0.8125rem",
});

export const error = style({
  color: theme.color.error,
  fontSize: "0.75rem",
});
