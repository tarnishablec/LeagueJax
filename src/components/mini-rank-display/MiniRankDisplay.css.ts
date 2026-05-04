import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { theme } from "@/styles/theme.css";

export const root = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  justifyContent: "start",
  gap: 4,
  minWidth: 0,
  color: theme.color.mutedForeground,
  lineHeight: 1,
});

export const icon = recipe({
  base: {
    objectFit: "contain",
    flexShrink: 0,
  },
  variants: {
    ranked: {
      true: {
        width: 18,
        height: 18,
      },
      false: {
        width: 14,
        height: 14,
        opacity: 0.76,
      },
    },
  },
});

export const text = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: theme.color.mutedForeground,
  fontSize: "0.7rem",
  fontWeight: 700,
  lineHeight: 1.1,
});

export const tooltipPositioner = style({
  zIndex: 60,
});

export const tooltipContent = style({
  padding: "5px 7px",
  borderRadius: 4,
  border: `1px solid ${theme.color.popoverBorder}`,
  background: theme.color.popupBackground,
  color: theme.color.foreground,
  fontSize: "0.72rem",
  fontWeight: 650,
  lineHeight: 1,
  boxShadow: "0 8px 18px oklch(0% 0 0 / 0.28)",
  whiteSpace: "nowrap",
});
