import { create } from "zustand";

export interface CurrentSummoner {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
}

export type LcuConnectionState =
  | { state: "detecting" }
  | { state: "connecting"; data: { port: number } }
  | { state: "connected"; data: { port: number } }
  | { state: "reconnecting"; data: { port: number } };

interface LcuState {
  connection: LcuConnectionState;
  summoner: CurrentSummoner | null;
  setConnection: (connection: LcuConnectionState) => void;
  setSummoner: (summoner: CurrentSummoner | null) => void;
}

export const useLcuStore = create<LcuState>((set) => ({
  connection: { state: "detecting" },
  summoner: null,
  setConnection: (connection) => set({ connection }),
  setSummoner: (summoner) => set({ summoner }),
}));

/** Selector: true when state is "connected" */
export const selectIsConnected = (st: LcuState) =>
  st.connection.state === "connected";

/** Selector: LCU port if available, otherwise null */
export const selectPort = (st: LcuState) =>
  "data" in st.connection ? st.connection.data.port : null;
