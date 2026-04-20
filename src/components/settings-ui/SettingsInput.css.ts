import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const input = style({
  height: 32,
  minWidth: 180,
  borderRadius: vars.settings.controlBorderRadius,
  border: `1px solid ${vars.settings.controlBorder}`,
  background: vars.settings.controlBg,
  color: vars.settings.controlText,
  paddingInline: 10,
  fontSize: "0.875rem",
  selectors: {
    "&:hover": {
      borderColor: vars.settings.controlHoverBorder,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const numberRoot = style({
  height: 32,
  minWidth: 180,
  borderRadius: vars.settings.controlBorderRadius,
  border: `1px solid ${vars.settings.controlBorder}`,
  background: vars.settings.controlBg,
  color: vars.settings.controlText,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "stretch",
  overflow: "hidden",
  selectors: {
    "&:hover": {
      borderColor: vars.settings.controlHoverBorder,
    },
    "&:focus-within": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: 1,
    },
  },
});

export const numberInput = style({
  minWidth: 0,
  width: "100%",
  height: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: vars.settings.controlText,
  fontSize: "0.875rem",
  paddingInline: 10,
});

export const numberControl = style({
  height: "100%",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  borderLeft: `1px solid ${vars.settings.controlBorder}`,
});

export const numberTrigger = style({
  minWidth: 24,
  border: "none",
  background: "transparent",
  color: vars.settings.controlText,
  display: "grid",
  placeItems: "center",
  lineHeight: 1,
  fontSize: "0.875rem",
  cursor: "pointer",
  userSelect: "none",
  selectors: {
    "&:hover": {
      background: vars.settings.selectOptionHoverBg,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: -1,
    },
    "&[data-disabled]": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
});

export const numberTriggerDecrement = style({
  borderRight: `1px solid ${vars.settings.controlBorder}`,
});

export const numberTriggerIncrement = style({});
