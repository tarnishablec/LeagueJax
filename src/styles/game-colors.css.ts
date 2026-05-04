import {
  createGlobalTheme,
  createGlobalThemeContract,
} from "@vanilla-extract/css";

export const gameColorVars = createGlobalThemeContract({
  outcome: {
    win: "game-outcome-win",
    lose: "game-outcome-lose",
    winSurface: "game-outcome-win-surface",
    loseSurface: "game-outcome-lose-surface",
    winSurfaceHover: "game-outcome-win-surface-hover",
    loseSurfaceHover: "game-outcome-lose-surface-hover",
    winForeground: "game-outcome-win-foreground",
    loseForeground: "game-outcome-lose-foreground",
  },
  team: {
    blue: "game-team-blue",
    red: "game-team-red",
    blueAccent: "game-team-blue-accent",
    redAccent: "game-team-red-accent",
  },
  damage: {
    physical: "game-damage-physical",
    magic: "game-damage-magic",
    trueDamage: "game-damage-true",
  },
});

createGlobalTheme(":root", gameColorVars, {
  outcome: {
    win: "rgba(91, 195, 82, 0.35)",
    lose: "rgba(255, 37, 43, 0.35)",
    winSurface: "rgba(91, 195, 82, 0.2)",
    loseSurface: "rgba(255, 37, 43, 0.18)",
    winSurfaceHover: "rgba(91, 195, 82, 0.28)",
    loseSurfaceHover: "rgba(255, 37, 43, 0.25)",
    winForeground: "oklch(0.54 0.17 142)",
    loseForeground: "oklch(0.58 0.2 22)",
  },
  team: {
    blue: "oklch(0.58 0.15 242)",
    red: "oklch(0.58 0.18 24)",
    blueAccent: "oklch(0.68 0.13 242 / 0.7)",
    redAccent: "oklch(0.66 0.16 24 / 0.72)",
  },
  damage: {
    physical: "oklch(0.62 0.18 24)",
    magic: "oklch(0.66 0.14 244)",
    trueDamage: "oklch(0.58 0 0)",
  },
});

createGlobalTheme(":root.dark", gameColorVars, {
  outcome: {
    win: "rgba(91, 195, 82, 0.05)",
    lose: "rgba(255, 37, 43, 0.05)",
    winSurface: "rgba(91, 195, 82, 0.14)",
    loseSurface: "rgba(255, 37, 43, 0.13)",
    winSurfaceHover: "rgba(91, 195, 82, 0.2)",
    loseSurfaceHover: "rgba(255, 37, 43, 0.19)",
    winForeground: "oklch(0.76 0.16 142)",
    loseForeground: "oklch(0.78 0.16 22)",
  },
  team: {
    blue: "oklch(0.78 0.12 242)",
    red: "oklch(0.78 0.15 24)",
    blueAccent: "oklch(0.68 0.13 242 / 0.7)",
    redAccent: "oklch(0.66 0.16 24 / 0.72)",
  },
  damage: {
    physical: "oklch(0.62 0.18 24)",
    magic: "oklch(0.66 0.14 244)",
    trueDamage: "oklch(0.72 0 0)",
  },
});
