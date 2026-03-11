import {
  createGlobalTheme,
  createGlobalThemeContract,
} from "@vanilla-extract/css";

export const vars = createGlobalThemeContract({
  color: {
    primary: "primary",
    success: "success",
    background: "background",
    foreground: "foreground",
    accent: "accent",
    accentForeground: "accent-foreground",
    mutedForeground: "muted-foreground",
    border: "border",
  },
});

createGlobalTheme(":root", vars, {
  color: {
    primary: "oklch(0.72 0.19 62)",
    success: "oklch(0.73 0.18 142)",
    background: "oklch(1 0 0)",
    foreground: "oklch(0.3 0 0)",
    accent: "oklch(0.86 0 0)",
    accentForeground: "oklch(0.2 0 0)",
    mutedForeground: "oklch(0.55 0 0)",
    border: "oklch(0.88 0 0)",
  },
});

createGlobalTheme(":root.dark", vars, {
  color: {
    primary: "oklch(0.72 0.19 62)",
    success: "oklch(0.73 0.18 142)",
    background: "oklch(0.16 0.015 270 / 0.22)",
    foreground: "oklch(0.985 0 0)",
    accent: "oklch(0.32 0.02 270 / 0.85)",
    accentForeground: "oklch(0.985 0 0)",
    mutedForeground: "oklch(0.708 0 0)",
    border: "oklch(0.4 0.015 270 / 0.3)",
  },
});
