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

function toModeTag(value: string | null): MatchModeTag {
  if (value === null || value.trim().length === 0 || value === "all") {
    return "all";
  }
  return value as MatchModeTag;
}

export type OngoingGameUiState = {
  phase: OngoingGamePhase;
  teamMembers: TeamMember[];
  matchHistoryTag: string | null;
  modeTag: MatchModeTag | null;
  gameflowSession: OngoingGameUpdated["gameflow_session"];
  champSelectSession: OngoingGameUpdated["champ_select_session"];
  summonersByPuuid: Record<string, SummonerInfo>;
  matchHistoriesByPuuid: Record<string, RawMatchSummaryGame[]>;
  matchHistoriesHydrated: boolean;
};

const initialState: OngoingGameUiState = {
  phase: "Idle",
  teamMembers: [],
  matchHistoryTag: null,
  modeTag: "all",
  gameflowSession: null,
  champSelectSession: null,
  summonersByPuuid: {},
  matchHistoriesByPuuid: {},
  matchHistoriesHydrated: false,
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
    set((state) => ({
      ...state,
      phase: payload.phase,
      teamMembers: payload.team_members,
      matchHistoryTag: payload.match_history_tag,
      modeTag: toModeTag(payload.match_history_tag),
      gameflowSession: payload.gameflow_session,
      champSelectSession: payload.champ_select_session,
      ...(payload.phase === "Idle"
        ? {
            summonersByPuuid: {},
            matchHistoriesByPuuid: {},
            matchHistoriesHydrated: false,
          }
        : {}),
    }));
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
          matchHistoriesHydrated: false,
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
        matchHistoriesHydrated: true,
      };
    });
  },
}));
