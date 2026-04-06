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

// ---------------------------------------------------------------------------
// Merge helpers for applyUpdated — preserve existing Ready data when the
// Updated payload would regress it (stale snapshot racing with incremental
// SummonersUpdated / MatchHistoriesUpdated events).
// ---------------------------------------------------------------------------

function mergeSummoners(
  payload: OngoingGameUpdated,
  existing: Record<string, SummonerInfo>,
  payloadPuuids: Set<string>,
): Record<string, SummonerInfo> {
  const merged: Record<string, SummonerInfo> = {};
  for (const entry of payload.summoner_states) {
    if (entry.summoner) {
      merged[entry.puuid] = stableSummoner(
        existing[entry.puuid],
        entry.summoner as SummonerInfo,
      );
    } else if (payloadPuuids.has(entry.puuid) && existing[entry.puuid]) {
      merged[entry.puuid] = existing[entry.puuid];
    }
  }
  return merged;
}

function mergeHistories(
  payload: OngoingGameUpdated,
  existing: Record<string, RawMatchSummaryGame[]>,
  payloadPuuids: Set<string>,
): Record<string, RawMatchSummaryGame[]> {
  const merged: Record<string, RawMatchSummaryGame[]> = {};
  for (const entry of payload.history_states) {
    if (entry.games) {
      merged[entry.puuid] = stableGames(
        existing[entry.puuid],
        entry.games as RawMatchSummaryGame[],
      );
    } else if (payloadPuuids.has(entry.puuid) && existing[entry.puuid]) {
      merged[entry.puuid] = existing[entry.puuid];
    }
  }
  return merged;
}

function sameTeamMember(left: TeamMember, right: TeamMember): boolean {
  return (
    left.assignedPosition === right.assignedPosition &&
    left.cellId === right.cellId &&
    left.championId === right.championId &&
    left.championPickIntent === right.championPickIntent &&
    left.gameName === right.gameName &&
    left.internalName === right.internalName &&
    left.isAutoFilled === right.isAutoFilled &&
    left.isHumanoid === right.isHumanoid &&
    left.nameVisibilityType === right.nameVisibilityType &&
    left.obfuscatePuuid === right.obfuscatePuuid &&
    left.obfuscateSummonerId === right.obfuscateSummonerId &&
    left.pickMode === right.pickMode &&
    left.pickTurn === right.pickTurn &&
    left.playerAlias === right.playerAlias &&
    left.playerType === right.playerType &&
    left.puuid === right.puuid &&
    left.selectedSkinId === right.selectedSkinId &&
    left.spell1Id === right.spell1Id &&
    left.spell2Id === right.spell2Id &&
    left.summonerId === right.summonerId &&
    left.tagLine === right.tagLine &&
    left.team === right.team &&
    left.wardSkinId === right.wardSkinId
  );
}

function stableTeamMembers(
  prev: TeamMember[],
  next: TeamMember[],
): TeamMember[] {
  if (prev.length !== next.length) {
    return next;
  }

  let changed = false;
  const stableMembers = next.map((member, index) => {
    const prevMember = prev[index];
    if (prevMember && sameTeamMember(prevMember, member)) {
      return prevMember;
    }

    changed = true;
    return member;
  });

  return changed ? stableMembers : prev;
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
          teamMembers: stableTeamMembers(
            state.teamMembers,
            payload.team_members,
          ),
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

      const payloadPuuids = new Set(payload.team_members.map((m) => m.puuid));
      const nextSummonerStates = Object.fromEntries(
        payload.summoner_states.map((entry) => [entry.puuid, entry]),
      );
      const nextHistoryStates = Object.fromEntries(
        payload.history_states.map((entry) => [entry.puuid, entry]),
      );
      const nextSummoners = mergeSummoners(
        payload,
        state.summonersByPuuid,
        payloadPuuids,
      );
      const nextHistories = mergeHistories(
        payload,
        state.matchHistoriesByPuuid,
        payloadPuuids,
      );

      return {
        ...state,
        phase: payload.phase,
        teamMembers: stableTeamMembers(state.teamMembers, payload.team_members),
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
