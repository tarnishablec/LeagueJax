import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "@/styles/theme.css";

export const button = recipe({
  base: {
    display: "grid",
    gridTemplateColumns: "auto auto",
    alignItems: "center",
    gap: 8,
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    color: vars.settings.controlText,
  },
  variants: {
    checked: {
      true: {},
      false: {},
    },
  },
});

export const track = recipe({
  base: {
    width: 36,
    height: 20,
    borderRadius: 999,
    display: "grid",
    alignItems: "center",
    paddingInline: 2,
    transition: "background-color 120ms ease-out",
  },
  variants: {
    checked: {
      true: {
        background: vars.settings.switchTrackOn,
        justifyItems: "end",
      },
      false: {
        background: vars.settings.switchTrackOff,
        justifyItems: "start",
      },
    },
  },
  defaultVariants: {
    checked: false,
  },
});

export const thumb = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  background: vars.settings.switchThumb,
});

export const text = style({
  fontSize: "0.75rem",
  color: vars.settings.switchText,
});
