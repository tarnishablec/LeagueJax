import { keyframes, style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css.ts";

const spinKeyframes = keyframes({
  to: {
    transform: "rotate(360deg)",
  },
});

const shimmerKeyframes = keyframes({
  from: {
    backgroundPosition: "100% 0",
  },
  to: {
    backgroundPosition: "-100% 0",
  },
});

const shimmerBackground = `linear-gradient(90deg, color-mix(in srgb, ${theme.color.deep} 58%, transparent) 0%, color-mix(in srgb, ${theme.color.blurry} 72%, transparent) 42%, color-mix(in srgb, ${theme.color.deep} 58%, transparent) 84%)`;

export const root = style({
  height: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateRows: "max-content minmax(0, 1fr)",
  gap: 12,
  padding: 16,
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

export const spin = style({
  animation: `${spinKeyframes} 900ms linear infinite`,
});

export const layout = style({
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)",
  gap: 12,
  "@media": {
    "screen and (max-width: 980px)": {
      gridTemplateColumns: "1fr",
      overflowY: "auto",
    },
  },
});

export const side = style({
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
  gridTemplateColumns: "24px minmax(0, 1fr) 40px",
  alignItems: "center",
  gap: 10,
  border: "none",
  borderRadius: 8,
  padding: 12,
  background: "transparent",
  color: theme.color.foreground,
  textAlign: "left",
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
  gap: 8,
  padding: "7px 8px",
  borderRadius: 6,
  outline: "1px solid transparent",
  background: `color-mix(in srgb, ${theme.color.surface} 52%, transparent)`,
  transition: "background 140ms, outline-color 140ms",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${theme.color.surface} 72%, transparent)`,
      outlineColor: theme.color.border,
    },
  },
});

export const loadingResourceRow = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 40px",
  alignItems: "center",
  gap: 8,
  padding: "7px 8px",
  borderRadius: 6,
  outline: "1px solid transparent",
  background: `color-mix(in srgb, ${theme.color.surface} 52%, transparent)`,
});

export const loadingResourceMain = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
});

export const loadingReplayRow = style({
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 40px",
  alignItems: "center",
  gap: 12,
  padding: 10,
  borderRadius: 8,
  outline: `1px solid ${theme.color.border}`,
  background: `color-mix(in srgb, ${theme.color.surface} 54%, transparent)`,
});

export const loadingTextStack = style({
  minWidth: 0,
  display: "grid",
  gap: 7,
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

export const loadingIcon = style({
  width: 24,
  height: 24,
  borderRadius: 6,
  background: shimmerBackground,
  backgroundSize: "200% 100%",
  animation: `${shimmerKeyframes} 1.15s ease-in-out infinite`,
});

export const loadingAction = style({
  width: 40,
  height: 40,
  borderRadius: 6,
  background: shimmerBackground,
  backgroundSize: "200% 100%",
  animation: `${shimmerKeyframes} 1.15s ease-in-out infinite`,
});

export const loadingLine = style({
  width: "62%",
  height: 10,
  borderRadius: 999,
  background: shimmerBackground,
  backgroundSize: "200% 100%",
  animation: `${shimmerKeyframes} 1.15s ease-in-out infinite`,
});

export const loadingLineShort = style([
  loadingLine,
  {
    width: "38%",
    height: 8,
  },
]);

export const resourceText = style({
  minWidth: 0,
  display: "grid",
  gap: 3,
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

export const content = style({
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "max-content minmax(0, 1fr)",
  gap: 10,
});

export const searchRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
});

export const replayList = style({
  minHeight: 0,
  overflowY: "auto",
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
});

export const replayMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 10px",
  color: theme.color.mutedForeground,
  fontSize: "0.6875rem",
});

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
  color: "oklch(0.74 0.17 28)",
  fontSize: "0.75rem",
});
