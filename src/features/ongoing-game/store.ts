import { create } from "zustand";
import type {
  OngoingGameMatchHistoryFilter,
  OngoingGamePhase,
  OngoingGameUpdated,
} from "@/bindings/ongoing_game";

type TeamMember = OngoingGameUpdated["team_members"][number];

export type OngoingGameUiState = {
  phase: OngoingGamePhase;
  loading: boolean;
  teamMembers: TeamMember[];
  queueId: number | null;
  queueName: string | null;
  queueShortName: string | null;
  mapId: number | null;
  mapName: string | null;
  gameMode: string | null;
  gameModeName: string | null;
  gameModeShortName: string | null;
  matchHistoryFilter: OngoingGameMatchHistoryFilter;
  matchHistoryTag: string | null;
  gameflowSession: OngoingGameUpdated["gameflow_session"];
};

const initialState: OngoingGameUiState = {
  phase: "Idle",
  loading: false,
  teamMembers: [],
  queueId: null,
  queueName: null,
  queueShortName: null,
  mapId: null,
  mapName: null,
  gameMode: null,
  gameModeName: null,
  gameModeShortName: null,
  matchHistoryFilter: "CurrentMode",
  matchHistoryTag: null,
  gameflowSession: null,
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
      loading: payload.loading,
      teamMembers: payload.team_members,
      queueId: payload.context.queue_id,
      queueName: payload.context.queue_name,
      queueShortName: payload.context.queue_short_name,
      mapId: payload.context.map_id,
      mapName: payload.context.map_name,
      gameMode: payload.context.game_mode,
      gameModeName: payload.context.game_mode_name,
      gameModeShortName: payload.context.game_mode_short_name,
      matchHistoryFilter: payload.context.match_history_filter,
      matchHistoryTag: payload.context.match_history_tag,
      gameflowSession: payload.gameflow_session,
    }));
  },
}));
