import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { createSolidStoreHook } from "./solid-zustand";

interface AppState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const appStore = createStore<AppState>()(
  persist(
    (set) => ({
      language: "zh-CN",
      setLanguage: (language) => set({ language }),
    }),
    { name: "league-jax-app" },
  ),
);

export const useSolidAppStore = createSolidStoreHook(appStore);
