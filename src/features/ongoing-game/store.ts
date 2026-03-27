import { create } from "zustand";
import type {
  OngoingGameMatchHistoryFilter,
  OngoingGamePhase,
  OngoingGameUpdated,
} from "@/bindings/ongoing_game";

type TeamMember = OngoingGameUpdated["team_members"][number];

export type OngoingGameUiState = {
  phase: OngoingGamePhase;
  teamMembers: TeamMember[];
  matchHistoryFilter: OngoingGameMatchHistoryFilter;
  gameflowSession: OngoingGameUpdated["gameflow_session"];
  champSelectSession: OngoingGameUpdated["champ_select_session"];
};

const initialState: OngoingGameUiState = {
  phase: "Idle",
  teamMembers: [],
  matchHistoryFilter: "CurrentMode",
  gameflowSession: null,
  champSelectSession: null,
};

type OngoingGameStore = OngoingGameUiState & {
  reset: () => void;
  applyUpdated: (payload: OngoingGameUpdated) => void;
};

export const useOngoingGameStore = create<OngoingGameStore>((set) => ({
  ...initialState,
  reset: () => {
    set(initialState);
  },
  applyUpdated: (payload) => {
    set((state) => ({
      ...state,
      phase: payload.phase,
      teamMembers: payload.team_members,
      matchHistoryFilter: payload.match_history_filter,
      gameflowSession: payload.gameflow_session,
      champSelectSession: payload.champ_select_session,
    }));
  },
}));
