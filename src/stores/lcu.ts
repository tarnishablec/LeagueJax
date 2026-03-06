import { create } from "zustand";

interface LcuState {
	connected: boolean;
	port: number | null;
	setConnected: (port: number) => void;
	setDisconnected: () => void;
}

export const useLcuStore = create<LcuState>((set) => ({
	connected: false,
	port: null,
	setConnected: (port) => set({ connected: true, port }),
	setDisconnected: () => set({ connected: false, port: null }),
}));
