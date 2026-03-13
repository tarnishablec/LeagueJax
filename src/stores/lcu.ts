import { create } from "zustand";

export interface Summoner {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface LcuInstanceInfo {
  pid: number;
  port: number;
  state: "authenticating" | "ready" | "closing";
  isFocused: boolean;
  installDir: string | null;
  gameName: string | null;
  tagLine: string | null;
  profileIconId: number | null;
  summonerLevel: number | null;
  region: string | null;
}

interface LcuState {
  instances: LcuInstanceInfo[];
  summoner: Summoner | null;
  setInstances: (instances: LcuInstanceInfo[]) => void;
  setSummoner: (summoner: Summoner | null) => void;
}

export const useLcuStore = create<LcuState>((set) => ({
  instances: [],
  summoner: null,
  setInstances: (instances) => set({ instances }),
  setSummoner: (summoner) => set({ summoner }),
}));

/** Selector: true when any instance is focused and ready */
export const selectIsConnected = (st: LcuState) =>
  st.instances.some((i) => i.isFocused && i.state === "ready");

/** Selector: focused instance's port, or null */
export const selectPort = (st: LcuState) => {
  const focused = st.instances.find((i) => i.isFocused);
  return focused?.port ?? null;
};
