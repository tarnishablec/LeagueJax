import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { createSolidStoreHook } from "./solid-zustand";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const themeStore = createStore<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "league-jax-theme" },
  ),
);

export const useSolidThemeStore = createSolidStoreHook(themeStore);
