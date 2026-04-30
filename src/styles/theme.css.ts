import {
  createGlobalTheme,
  createGlobalThemeContract,
  createGlobalVar,
  fallbackVar,
} from "@vanilla-extract/css";

export const THEME_BACKDROP_OVERRIDE_PROPERTY = "--theme-backdrop-override";
export const themeBackdropOverride = createGlobalVar("theme-backdrop-override");

export const vars = createGlobalThemeContract({
  color: {
    primary: "primary",
    success: "success",
    error: "error",
    win: "win",
    lose: "lose",
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

createGlobalTheme(":root", vars, {
  color: {
    primary: "rgb(245 130 0)",
    success: "rgb(91 195 82)",
    error: "rgb(255 37 43)",
    win: "rgba(91, 195, 82, 0.35)",
    lose: "rgba(255, 37, 43, 0.35)",
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
    popoverBorder: vars.color.border,
    popupBackground: `rgb(255 255 255 / 0.82)`,
  },
});

createGlobalTheme(":root.dark", vars, {
  color: {
    primary: "rgb(245 130 0)",
    success: "rgb(91 195 82)",
    error: "rgb(255 37 43)",
    win: "rgba(91, 195, 82, 0.05)",
    lose: "rgba(255, 37, 43, 0.05)",
    background: `rgb(25 26 28)`,
    backdrop: fallbackVar(themeBackdropOverride, `rgb(25 26 28)`),
    foreground: `rgba(255, 255, 255, 0.875)`,
    accent: `rgb(255 255 255 / 0.1)`,
    surface: `rgb(0 0 0 / 0.1)`,
    blurry: `rgb(0 0 0 / 0.25)`,
    deep: `rgb(0 0 0 / 0.5)`,
    accentForeground: vars.color.foreground,
    mutedForeground: "rgba(255, 255, 255, 0.5)",
    border: `rgb(255 255 255 / 0.05)`,
    popoverBorder: "rgba(255, 255, 255, 0.12)",
    popupBackground: `rgb(25 26 28 / 0.95)`,
  },
});
