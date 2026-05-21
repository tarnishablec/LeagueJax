import { createStore } from "zustand/vanilla";
import type { MatchModeTag } from "../types/match-mode";

export type MatchListViewStore = {
  modeTag: MatchModeTag;
  setModeTag: (modeTag: MatchModeTag) => void;
};

export const matchListViewStore = createStore<MatchListViewStore>()((set) => ({
  modeTag: "all",
  setModeTag: (modeTag) => set({ modeTag }),
}));
