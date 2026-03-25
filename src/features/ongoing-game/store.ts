import { create } from "zustand";
import type {
  OngoingGameMatchHistoryFilter,
  OngoingGamePhase,
  OngoingGamePhaseChanged,
  OngoingGamePlayerSnapshot,
  OngoingGameSnapshotUpdated,
  PlayerSlot,
  Side,
} from "@/bindings/ongoing_game";

export type OngoingGameUiState = {
  phase: OngoingGamePhase;
  loading: boolean;
  ourSide: Side | null;
  blueSlots: PlayerSlot[];
  redSlots: PlayerSlot[];
  bluePlayers: OngoingGamePlayerSnapshot[];
  redPlayers: OngoingGamePlayerSnapshot[];
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
};

const initialState: OngoingGameUiState = {
  phase: "Idle",
  loading: false,
  ourSide: null,
  blueSlots: [],
  redSlots: [],
  bluePlayers: [],
  redPlayers: [],
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
};

type OngoingGameStore = OngoingGameUiState & {
  reset: () => void;
  applyPhaseChanged: (payload: OngoingGamePhaseChanged) => void;
  applySnapshotUpdated: (payload: OngoingGameSnapshotUpdated) => void;
};

export const useOngoingGameStore = create<OngoingGameStore>((set) => ({
  ...initialState,
  reset: () => {
    set(initialState);
  },
  applyPhaseChanged: (payload) => {
    set((state) => ({
      ...state,
      phase: payload.phase,
      loading: payload.loading,
      ourSide: payload.our_side,
      blueSlots: payload.blue_players,
      redSlots: payload.red_players,
      bluePlayers: payload.phase === "Idle" ? [] : state.bluePlayers,
      redPlayers: payload.phase === "Idle" ? [] : state.redPlayers,
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
    }));
  },
  applySnapshotUpdated: (payload) => {
    set((state) => ({
      ...state,
      phase: payload.phase,
      loading: payload.loading,
      ourSide: payload.our_side,
      bluePlayers: payload.blue_players,
      redPlayers: payload.red_players,
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
    }));
  },
}));
