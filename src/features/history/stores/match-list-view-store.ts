import { create } from "zustand";
import type { MatchModeTag } from "../types/match-mode";

type MatchListViewStore = {
  modeTag: MatchModeTag;
  setModeTag: (modeTag: MatchModeTag) => void;
};

export const useMatchListViewStore = create<MatchListViewStore>((set) => ({
  modeTag: "all",
  setModeTag: (modeTag) => set({ modeTag }),
}));
