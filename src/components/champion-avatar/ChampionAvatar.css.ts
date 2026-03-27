import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css.ts";

export const wrapper = style({
  position: "relative",
  display: "inline-grid",
  placeItems: "center",
  lineHeight: 0,
});

export const levelBadge = style({
  position: "absolute",
  right: 0,
  bottom: 0,
  transform: "translate(24%, 24%)",
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  borderRadius: 4,
  display: "inline-grid",
  placeItems: "center",
  fontSize: "0.62rem",
  fontWeight: 700,
  lineHeight: 1,
  color: "oklch(0.98 0 0 / 0.96)",
  background: "color-mix(in oklch, oklch(0.14 0.01 260) 72%, transparent)",
  border: `1px solid color-mix(in oklch, ${vars.color.background} 65%, transparent)`,
});
