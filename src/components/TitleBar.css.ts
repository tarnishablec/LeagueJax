import { style } from "@vanilla-extract/css";
import { theme } from "../styles/theme.css";

export const header = style({
  display: "grid",
  gridTemplateColumns: "1fr auto auto auto auto",
  height: 40,
  userSelect: "none",
  // borderBottom: `1px solid ${vars.color.border}`,
  background: "transparent",
  flexShrink: 0,
});

export const centerSlots = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  alignItems: "end",
  minWidth: 0,
  overflow: "hidden",
  // paddingInline: 8,
});

export const toolbar = style({
  display: "grid",
  gridAutoColumns: "auto",
  gridAutoFlow: "column",
  alignItems: "center",
  paddingInlineStart: 4,
});

export const divider = style({
  alignSelf: "center",
  height: 16,
  width: 1,
  background: theme.color.border,
  marginInline: 4,
});

export const windowControls = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
});
