import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const champion = style({
  display: "grid",
  gridTemplateColumns: "24px minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});
export const portrait = style({
  width: 24,
  height: 24,
  borderRadius: 4,
  background: theme.color.surface,
});
export const loadingRow = style({ position: "relative", height: 45 });
export const rowSkeleton = style({
  position: "absolute",
  insetInline: 12,
  top: 10,
  height: 24,
  borderRadius: 4,
  background: `rgb(from ${theme.color.foreground} r g b / 1%)`,
});
export const name = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
export const numericCell = style({
  fontVariantNumeric: "tabular-nums",
});
