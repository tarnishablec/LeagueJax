import {
  createGlobalTheme,
  createGlobalThemeContract,
} from "@vanilla-extract/css";

export const vars = createGlobalThemeContract({
  color: {
    primary: "primary",
    success: "success",
    error: "error",
    background: "background",
    popupBackground: "popup-background",
    foreground: "foreground",
    accent: "accent",
    surface: "surface",
    accentForeground: "accent-foreground",
    mutedForeground: "muted-foreground",
    border: "border",
    popoverBorder: "popover-border",
  },
});

createGlobalTheme(":root", vars, {
  color: {
    primary: "oklch(0.72 0.19 62)",
    success: "oklch(0.73 0.18 142)",
    error: "oklch(0.65 0.25 27)",
    background: `rgb(255 255 255 / 1)`,
    popupBackground: `rgb(from ${vars.color.background} r g b / 0.82)`,
    foreground: `rgb(0 0 0 / 0.875)`,
    accent: `rgb(from ${vars.color.background} r g b / 0.5)`,
    surface: `rgb(0 0 0 / 0.1)`,
    accentForeground: `oklch(from ${vars.color.foreground} 0.2 c h)`,
    mutedForeground: `rgba(from ${vars.color.foreground} r g b / 0.875)`,
    border: `oklch(from ${vars.color.foreground} 0.68 0 0 / 0.2)`,
    popoverBorder: vars.color.border,
  },
});

createGlobalTheme(":root.dark", vars, {
  color: {
    primary: "oklch(0.72 0.19 62)",
    success: "oklch(0.73 0.18 142)",
    error: "oklch(0.65 0.25 27)",
    background: `rgb(25 26 28)`,
    foreground: `rgba(255, 255, 255, 0.875)`,
    accent: `rgb(255 255 255 / 0.15)`,
    surface: `rgb(0 0 0 / 0.1)`,
    accentForeground: vars.color.foreground,
    mutedForeground: `rgb(from ${vars.color.foreground} r g b / 0.5)`,
    border: `rgb(255 255 255 / 0.05)`,
    popoverBorder: `oklch(from ${vars.color.foreground} l c h / 0.12)`,
    popupBackground: `rgb(from ${vars.color.background} r g b / 0.9)`,
  },
});
