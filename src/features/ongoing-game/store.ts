import { create } from "zustand";
import type { RawMatchSummaryGame } from "@/bindings/matches";
import type {
  OngoingGameMatchHistoriesUpdated,
  OngoingGameMatchHistoryState,
  OngoingGamePhase,
  OngoingGameSummonerState,
  OngoingGameSummonersUpdated,
  OngoingGameUpdated,
} from "@/bindings/ongoing_game";
import type { SummonerInfo } from "@/bindings/summoner";
import type { MatchModeTag } from "@/features/history/hooks/use-match-history";

type TeamMember = OngoingGameUpdated["team_members"][number];
const CURRENT_MODE_VALUE = "__current_mode__";

// ---------------------------------------------------------------------------
// Reference-stability helpers — reuse old objects when data is equivalent
// so that Zustand selectors (Object.is) skip unnecessary React re-renders.
// ---------------------------------------------------------------------------

function stableGames(
  prev: RawMatchSummaryGame[] | undefined,
  next: RawMatchSummaryGame[],
): RawMatchSummaryGame[] {
  if (!prev || prev.length !== next.length) return next;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].json.gameId !== next[i].json.gameId) return next;
  }
  return prev;
}

function stableSummoner(
  prev: SummonerInfo | undefined,
  next: SummonerInfo,
): SummonerInfo {
  if (
    prev &&
    prev.puuid === next.puuid &&
    prev.summonerLevel === next.summonerLevel &&
    prev.profileIconId === next.profileIconId &&
    prev.gameName === next.gameName &&
    prev.tagLine === next.tagLine
  ) {
    return prev;
  }
  return next;
}

function stableRecord<V>(
  prev: Record<string, V>,
  next: Record<string, V>,
): Record<string, V> {
  const nextKeys = Object.keys(next);
  if (Object.keys(prev).length !== nextKeys.length) return next;
  for (const key of nextKeys) {
    if (prev[key] !== next[key]) return next;
  }
  return prev;
}

function toModeTag(value: string | null): MatchModeTag | null {
  if (value === CURRENT_MODE_VALUE) {
    return null;
  }

  if (value === null || value.trim().length === 0 || value === "all") {
    return "all";
  }
  return value as MatchModeTag;
}

export type OngoingGameUiState = {
  phase: OngoingGamePhase;
  lifecycleGameId: number | null;
  teamMembers: TeamMember[];
  matchHistoryTag: string | null;
  effectiveQueueId: number | null;
  effectiveModeTag: string | null;
  matchHistoriesPending: boolean;
  modeTag: MatchModeTag | null;
  gameflowSession: OngoingGameUpdated["gameflow_session"];
  champSelectSession: OngoingGameUpdated["champ_select_session"];
  summonerStatesByPuuid: Record<string, OngoingGameSummonerState>;
  historyStatesByPuuid: Record<string, OngoingGameMatchHistoryState>;
  summonersByPuuid: Record<string, SummonerInfo>;
  matchHistoriesByPuuid: Record<string, RawMatchSummaryGame[]>;
};

const initialState: OngoingGameUiState = {
  phase: "Idle",
  lifecycleGameId: null,
  teamMembers: [],
  matchHistoryTag: null,
  effectiveQueueId: null,
  effectiveModeTag: null,
  matchHistoriesPending: false,
  modeTag: null,
  gameflowSession: null,
  champSelectSession: null,
  summonerStatesByPuuid: {},
  historyStatesByPuuid: {},
  summonersByPuuid: {},
  matchHistoriesByPuuid: {},
};

type OngoingGameStore = OngoingGameUiState & {
  reset: () => void;
  setModeTag: (tag: MatchModeTag | null) => void;
  applyUpdated: (payload: OngoingGameUpdated) => void;
  applySummonersUpdated: (payload: OngoingGameSummonersUpdated) => void;
  applyMatchHistoriesUpdated: (
    payload: OngoingGameMatchHistoriesUpdated,
  ) => void;
};

export const useOngoingGameStore = create<OngoingGameStore>((set) => ({
  ...initialState,
  reset: () => {
    set(initialState);
  },
  setModeTag: (tag) => {
    set({ modeTag: tag });
  },
  applyUpdated: (payload) => {
    set((state) => {
      if (payload.phase === "Idle") {
        return {
          ...state,
          phase: payload.phase,
          teamMembers: payload.team_members,
          matchHistoryTag: payload.match_history_tag,
          effectiveQueueId: payload.effective_queue_id,
          effectiveModeTag: payload.effective_mode_tag,
          matchHistoriesPending: payload.match_histories_pending,
          modeTag: toModeTag(payload.match_history_tag),
          gameflowSession: payload.gameflow_session,
          champSelectSession: payload.champ_select_session,
          lifecycleGameId: null,
          summonerStatesByPuuid: {},
          historyStatesByPuuid: {},
          summonersByPuuid: {},
          matchHistoriesByPuuid: {},
        };
      }

      // Build next maps with per-entry reference stability.
      const nextSummonerStates = Object.fromEntries(
        payload.summoner_states.map((entry) => [entry.puuid, entry]),
      );
      const nextHistoryStates = Object.fromEntries(
        payload.history_states.map((entry) => [entry.puuid, entry]),
      );
      const nextSummoners = Object.fromEntries(
        payload.summoner_states
          .filter((entry) => entry.summoner)
          .map((entry) => [
            entry.puuid,
            stableSummoner(
              state.summonersByPuuid[entry.puuid],
              entry.summoner as SummonerInfo,
            ),
          ]),
      );
      const nextHistories = Object.fromEntries(
        payload.history_states
          .filter((entry) => entry.games)
          .map((entry) => [
            entry.puuid,
            stableGames(
              state.matchHistoriesByPuuid[entry.puuid],
              entry.games as RawMatchSummaryGame[],
            ),
          ]),
      );

      return {
        ...state,
        phase: payload.phase,
        teamMembers: payload.team_members,
        matchHistoryTag: payload.match_history_tag,
        effectiveQueueId: payload.effective_queue_id,
        effectiveModeTag: payload.effective_mode_tag,
        matchHistoriesPending: payload.match_histories_pending,
        modeTag: toModeTag(payload.match_history_tag),
        gameflowSession: payload.gameflow_session,
        champSelectSession: payload.champ_select_session,
        lifecycleGameId: payload.lifecycle_game_id,
        summonerStatesByPuuid: stableRecord(
          state.summonerStatesByPuuid,
          nextSummonerStates,
        ),
        historyStatesByPuuid: stableRecord(
          state.historyStatesByPuuid,
          nextHistoryStates,
        ),
        summonersByPuuid: stableRecord(state.summonersByPuuid, nextSummoners),
        matchHistoriesByPuuid: stableRecord(
          state.matchHistoriesByPuuid,
          nextHistories,
        ),
      };
    });
  },
  applySummonersUpdated: (payload) => {
    set((state) => ({
      ...state,
      ...(payload.phase === "Idle"
        ? {
            summonerStatesByPuuid: {},
            summonersByPuuid: {},
          }
        : {
            summonerStatesByPuuid: {
              ...state.summonerStatesByPuuid,
              [payload.state.puuid]: payload.state,
            },
            summonersByPuuid: payload.state.summoner
              ? {
                  ...state.summonersByPuuid,
                  [payload.state.puuid]: payload.state.summoner,
                }
              : (() => {
                  const next = { ...state.summonersByPuuid };
                  delete next[payload.state.puuid];
                  return next;
                })(),
          }),
    }));
  },
  applyMatchHistoriesUpdated: (payload) => {
    set((state) => {
      if (payload.phase === "Idle") {
        return {
          ...state,
          historyStatesByPuuid: {},
          matchHistoriesByPuuid: {},
        };
      }

      const nextHistoryStatesByPuuid = {
        ...state.historyStatesByPuuid,
        [payload.state.puuid]: payload.state,
      };
      const nextMatchHistoriesByPuuid = {
        ...state.matchHistoriesByPuuid,
      };
      if (payload.state.games) {
        nextMatchHistoriesByPuuid[payload.state.puuid] = payload.state.games;
      } else {
        delete nextMatchHistoriesByPuuid[payload.state.puuid];
      }

      return {
        ...state,
        historyStatesByPuuid: nextHistoryStatesByPuuid,
        matchHistoriesByPuuid: nextMatchHistoriesByPuuid,
      };
    });
  },
}));
