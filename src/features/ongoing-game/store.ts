import { create } from "zustand";
import type {
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
};

const initialState: OngoingGameUiState = {
  phase: "Idle",
  loading: false,
  ourSide: null,
  blueSlots: [],
  redSlots: [],
  bluePlayers: [],
  redPlayers: [],
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
    }));
  },
}));
