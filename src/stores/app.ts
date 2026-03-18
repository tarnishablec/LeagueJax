import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "zh-CN",
      setLanguage: (language) => set({ language }),
    }),
    { name: "league-jax-app" },
  ),
);
