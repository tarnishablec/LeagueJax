import {
  createGlobalTheme,
  createGlobalThemeContract,
  createGlobalVar,
  fallbackVar,
} from "@vanilla-extract/css";

export const THEME_BACKDROP_OVERRIDE_PROPERTY = "--theme-backdrop-override";
export const themeBackdropOverride = createGlobalVar("theme-backdrop-override");

export const theme = createGlobalThemeContract({
  color: {
    primary: "primary",
    tint: "tint",
    tintHover: "tint-hover",
    success: "success",
    error: "error",
    background: "background",
    backdrop: "backdrop",
    popupBackground: "popup-background",
    foreground: "foreground",
    accent: "accent",
    surface: "surface",
    blurry: "blurry",
    deep: "deep",
    accentForeground: "accent-foreground",
    mutedForeground: "muted-foreground",
    border: "border",
    popoverBorder: "popover-border",
  },
});

createGlobalTheme(":root", theme, {
  color: {
    primary: "rgb(245 130 0)",
    tint: `color-mix(in oklch, ${theme.color.primary} 10%, ${theme.color.background})`,
    tintHover: `color-mix(in oklch, ${theme.color.primary} 6%, ${theme.color.background})`,
    success: "rgb(91 195 82)",
    error: "rgb(255 37 43)",
    background: `rgb(255 255 255 / 1)`,
    backdrop: fallbackVar(themeBackdropOverride, `rgb(255 255 255 / 1)`),
    foreground: `rgb(0 0 0 / 0.875)`,
    accent: "rgba(255, 255, 255, 0.5)",
    surface: `rgb(0 0 0 / 0.1)`,
    blurry: `rgb(0 0 0 / 0.25)`,
    deep: `rgb(0 0 0 / 0.5)`,
    accentForeground: "rgb(22 22 22)",
    mutedForeground: "rgba(0, 0, 0, 0.875)",
    border: "rgba(152, 152, 152, 0.2)",
    popoverBorder: theme.color.border,
    popupBackground: `rgb(255 255 255 / 0.96)`,
  },
});

createGlobalTheme(":root.dark", theme, {
  color: {
    primary: "rgb(245 130 0)",
    tint: `color-mix(in oklch, ${theme.color.primary} 10%, ${theme.color.background})`,
    tintHover: `color-mix(in oklch, ${theme.color.primary} 6%, ${theme.color.background})`,
    success: "rgb(91 195 82)",
    error: "rgb(255 37 43)",
    background: `rgb(25 26 28)`,
    backdrop: fallbackVar(themeBackdropOverride, `rgb(25 26 28)`),
    foreground: `rgba(255, 255, 255, 0.875)`,
    accent: `rgb(255 255 255 / 0.1)`,
    surface: `rgb(0 0 0 / 0.1)`,
    blurry: `rgb(0 0 0 / 0.25)`,
    deep: `rgb(0 0 0 / 0.5)`,
    accentForeground: theme.color.foreground,
    mutedForeground: "rgba(255, 255, 255, 0.5)",
    border: `rgb(255 255 255 / 0.05)`,
    popoverBorder: "rgba(255, 255, 255, 0.12)",
    popupBackground: `rgb(25 26 28 / 0.98)`,
  },
});
