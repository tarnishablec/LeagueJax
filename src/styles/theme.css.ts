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
    backgroundRaw: "backgroundRaw",
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
    background: vars.color.backgroundRaw,
    backgroundRaw: "oklch(0.994 0 0)",
    popupBackground: `oklch(from ${vars.color.backgroundRaw} 0.972 c h)`,
    foreground: "oklch(0.3 0 0)",
    accent: `oklch(from ${vars.color.backgroundRaw} 0.86 c h)`,
    surface: `oklch(from ${vars.color.foreground} 0.24 c h / 0.22)`,
    accentForeground: `oklch(from ${vars.color.foreground} 0.2 c h)`,
    mutedForeground: `oklch(from ${vars.color.foreground} 0.55 c h)`,
    border: `oklch(from ${vars.color.accent} 0.88 c h)`,
    popoverBorder: vars.color.border,
  },
});

createGlobalTheme(":root.dark", vars, {
  color: {
    primary: "oklch(0.72 0.19 62)",
    success: "oklch(0.73 0.18 142)",
    error: "oklch(0.65 0.25 27)",
    background: `oklch(from ${vars.color.backgroundRaw} 0.16 0.015 270 / 0.22)`,
    backgroundRaw: "oklch(0.244 0 0)",
    popupBackground: `oklch(from ${vars.color.backgroundRaw} 0.22 0 0)`,
    foreground: "oklch(0.985 0 0)",
    accent: `oklch(from ${vars.color.backgroundRaw} 0.32 0.02 270 / 0.85)`,
    surface: `oklch(from ${vars.color.backgroundRaw} 0.223 0.002 17.273 / 0.34)`,
    accentForeground: vars.color.foreground,
    mutedForeground: `oklch(from ${vars.color.foreground} 0.708 c h)`,
    border: `oklch(from ${vars.color.backgroundRaw} 0.4 0.015 270 / 0.3)`,
    popoverBorder: `oklch(from ${vars.color.foreground} l c h / 0.12)`,
  },
});
