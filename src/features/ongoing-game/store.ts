import { create } from "zustand";
import type { RawMatchSummaryGame } from "@/bindings/matches";
import type {
  OngoingGameMatchHistoriesUpdated,
  OngoingGamePhase,
  OngoingGameSummonersUpdated,
  OngoingGameUpdated,
} from "@/bindings/ongoing_game";
import type { SummonerInfo } from "@/bindings/summoner";
import type { MatchModeTag } from "@/features/history/hooks/use-match-history";

type TeamMember = OngoingGameUpdated["team_members"][number];
const CURRENT_MODE_VALUE = "__current_mode__";

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
  teamMembers: TeamMember[];
  matchHistoryTag: string | null;
  effectiveQueueId: number | null;
  effectiveModeTag: string | null;
  matchHistoriesPending: boolean;
  modeTag: MatchModeTag | null;
  gameflowSession: OngoingGameUpdated["gameflow_session"];
  champSelectSession: OngoingGameUpdated["champ_select_session"];
  summonersByPuuid: Record<string, SummonerInfo>;
  matchHistoriesByPuuid: Record<string, RawMatchSummaryGame[]>;
};

const initialState: OngoingGameUiState = {
  phase: "Idle",
  teamMembers: [],
  matchHistoryTag: null,
  effectiveQueueId: null,
  effectiveModeTag: null,
  matchHistoriesPending: false,
  modeTag: "all",
  gameflowSession: null,
  champSelectSession: null,
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
      const pendingTransition =
        payload.match_histories_pending && !state.matchHistoriesPending;
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
        ...(payload.phase === "Idle"
          ? {
              summonersByPuuid: {},
              matchHistoriesByPuuid: {},
            }
          : pendingTransition
            ? { matchHistoriesByPuuid: {} }
            : {}),
      };
    });
  },
  applySummonersUpdated: (payload) => {
    set((state) => ({
      ...state,
      ...(payload.phase === "Idle"
        ? {
            summonersByPuuid: {},
          }
        : {
            summonersByPuuid: Object.fromEntries(
              payload.summoners.map((summoner) => [summoner.puuid, summoner]),
            ),
          }),
    }));
  },
  applyMatchHistoriesUpdated: (payload) => {
    set((state) => {
      if (payload.phase === "Idle") {
        return {
          ...state,
          matchHistoriesByPuuid: {},
        };
      }

      const nextMatchHistoriesByPuuid = {
        ...state.matchHistoriesByPuuid,
      };
      for (const [puuid, games] of Object.entries(payload.match_histories)) {
        nextMatchHistoriesByPuuid[puuid] = games;
      }

      return {
        ...state,
        matchHistoriesByPuuid: nextMatchHistoriesByPuuid,
      };
    });
  },
}));
