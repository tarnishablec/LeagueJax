import { style, styleVariants } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const section = style({
  position: "relative",
  isolation: "isolate",
  display: "grid",
  gap: 8,
  padding: 8,
  borderRadius: 12,
  background: theme.color.background,
  outline: `1px solid ${theme.color.border}`,
  outlineOffset: -1,
});

export const enemy = style({
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 1fr) max-content",
  gap: 8,
  alignItems: "center",
});

export const portrait = style({
  width: 36,
  height: 36,
  borderRadius: 10,
  objectFit: "cover",
});

export const enemyName = style({
  margin: 0,
  fontSize: 15,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
export const enemyInfo = style({ display: "grid", gap: 4, minWidth: 0 });
export const metadata = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
  minWidth: 0,
});

export const muted = style({
  margin: 0,
  color: theme.color.mutedForeground,
  fontSize: 12,
});

export const toggle = style({
  position: "absolute",
  inset: 0,
  zIndex: 1,
  border: "none",
  borderRadius: "inherit",
  padding: 0,
  background: "transparent",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${theme.color.foreground} 2%, transparent)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.primary}`,
      outlineOffset: -2,
    },
  },
});

export const positionControl = style({ position: "relative", zIndex: 2 });

// Share all four tracks with the list so numeric widths align across rows.
export const row = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  gap: 8,
  alignItems: "center",
});

export const smallPortrait = style({
  width: 32,
  height: 32,
  borderRadius: 8,
  objectFit: "cover",
});

export const name = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 300,
  fontSize: "0.85rem",
});

export const rate = style({
  fontVariantNumeric: "tabular-nums",
  fontWeight: 650,
  justifySelf: "end",
  whiteSpace: "nowrap",
});

export const games = style([
  muted,
  {
    fontVariantNumeric: "tabular-nums",
    justifySelf: "end",
    whiteSpace: "nowrap",
  },
]);

export const rateTone = styleVariants({
  win: { color: theme.color.success },
  loss: { color: theme.color.error },
});

export const status = style({
  gridColumn: "1 / -1",
  margin: 0,
  minHeight: 112,
  display: "grid",
  justifyItems: "start",
  alignContent: "center",
  gap: 8,
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
});

export const emptyStatus = style([
  status,
  {
    minHeight: 0,
    gridTemplateColumns: "14px minmax(0, 1fr)",
    alignItems: "center",
    gap: 6,
    paddingBlock: "2px 4px",
    paddingInlineStart: 44,
  },
]);

export const body = style({
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr) max-content max-content",
  gap: 8,
  selectors: { "&[hidden]": { display: "none" } },
});

export const retry = style({
  position: "relative",
  zIndex: 2,
  padding: "4px 8px",
  borderRadius: 4,
  background: theme.color.surface,
  color: theme.color.foreground,
  selectors: {
    "&:focus-visible": {
      outline: `1px solid ${theme.color.primary}`,
      outlineOffset: -1,
    },
  },
});
