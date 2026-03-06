import { create } from "zustand";

interface AppState {
	language: string;
	setLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
	language: "zh-CN",
	setLanguage: (language) => set({ language }),
}));
