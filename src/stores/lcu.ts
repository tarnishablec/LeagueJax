import { create } from "zustand";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";

interface LcuState {
  instances: LcuInstanceInfo[];
  summoner: SummonerInfo | null;
  setInstances: (instances: LcuInstanceInfo[]) => void;
  setSummoner: (summoner: SummonerInfo | null) => void;
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
