import { create } from "zustand";

export interface CurrentSummoner {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
}

interface LcuState {
  connected: boolean;
  port: number | null;
  summoner: CurrentSummoner | null;
  setConnected: (port: number) => void;
  setDisconnected: () => void;
  setSummoner: (summoner: CurrentSummoner) => void;
}

export const useLcuStore = create<LcuState>((set) => ({
  connected: false,
  port: null,
  summoner: null,
  setConnected: (port) => set({ connected: true, port }),
  setDisconnected: () => set({ connected: false, port: null, summoner: null }),
  setSummoner: (summoner) => set({ summoner }),
}));
