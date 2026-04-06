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
// Generic reference-stability helpers
// ---------------------------------------------------------------------------

/** Shallow-compare two flat objects by own enumerable keys. */
function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/** Return `prev` when all values are identical, avoiding a new reference. */
function stableRef<T extends Record<string, unknown>>(
  prev: T | undefined,
  next: T,
): T {
  return prev && shallowEqual(prev, next) ? prev : next;
}

/** Return `prev` when all entries are reference-equal. */
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

function stableTeamMembers(
  prev: TeamMember[],
  next: TeamMember[],
): TeamMember[] {
  if (prev.length !== next.length) return next;
  let changed = false;
  const stable = next.map((member, i) => {
    const p = prev[i];
    if (p && shallowEqual(p, member)) return p;
    changed = true;
    return member;
  });
  return changed ? stable : prev;
}

// ---------------------------------------------------------------------------
// Merge helpers — preserve existing Ready data when the Updated payload
// would regress it (stale snapshot racing with incremental events).
// ---------------------------------------------------------------------------

function mergeSummoners(
  payload: OngoingGameUpdated,
  existing: Record<string, SummonerInfo>,
  teamPuuids: Set<string>,
): Record<string, SummonerInfo> {
  const merged: Record<string, SummonerInfo> = {};
  for (const entry of payload.summoner_states) {
    if (entry.summoner) {
      merged[entry.puuid] = stableRef(
        existing[entry.puuid],
        entry.summoner as SummonerInfo,
      );
    } else if (teamPuuids.has(entry.puuid) && existing[entry.puuid]) {
      merged[entry.puuid] = existing[entry.puuid];
    }
  }
  return merged;
}

function mergeHistories(
  payload: OngoingGameUpdated,
  existing: Record<string, RawMatchSummaryGame[]>,
  teamPuuids: Set<string>,
): Record<string, RawMatchSummaryGame[]> {
  const merged: Record<string, RawMatchSummaryGame[]> = {};
  for (const entry of payload.history_states) {
    if (entry.games) {
      merged[entry.puuid] = stableGames(
        existing[entry.puuid],
        entry.games as RawMatchSummaryGame[],
      );
    } else if (teamPuuids.has(entry.puuid) && existing[entry.puuid]) {
      merged[entry.puuid] = existing[entry.puuid];
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------

function toModeTag(value: string | null): MatchModeTag | null {
  if (value === CURRENT_MODE_VALUE) return null;
  if (value === null || value.trim().length === 0 || value === "all")
    return "all";
  return value as MatchModeTag;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

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

/** Fields shared by every applyUpdated branch. */
function commonFields(payload: OngoingGameUpdated) {
  return {
    phase: payload.phase,
    matchHistoryTag: payload.match_history_tag,
    effectiveQueueId: payload.effective_queue_id,
    effectiveModeTag: payload.effective_mode_tag,
    matchHistoriesPending: payload.match_histories_pending,
    modeTag: toModeTag(payload.match_history_tag),
    gameflowSession: payload.gameflow_session,
    champSelectSession: payload.champ_select_session,
  } as const;
}

export const useOngoingGameStore = create<OngoingGameStore>((set) => ({
  ...initialState,

  reset: () => set(initialState),

  setModeTag: (tag) => set({ modeTag: tag }),

  applyUpdated: (payload) => {
    set((state) => {
      const shared = commonFields(payload);
      const teamMembers = stableTeamMembers(
        state.teamMembers,
        payload.team_members,
      );

      if (payload.phase === "Idle") {
        return {
          ...state,
          ...shared,
          teamMembers,
          lifecycleGameId: null,
          summonerStatesByPuuid: {},
          historyStatesByPuuid: {},
          summonersByPuuid: {},
          matchHistoriesByPuuid: {},
        };
      }

      const teamPuuids = new Set(payload.team_members.map((m) => m.puuid));

      return {
        ...state,
        ...shared,
        teamMembers,
        lifecycleGameId: payload.lifecycle_game_id,
        summonerStatesByPuuid: stableRecord(
          state.summonerStatesByPuuid,
          Object.fromEntries(payload.summoner_states.map((e) => [e.puuid, e])),
        ),
        historyStatesByPuuid: stableRecord(
          state.historyStatesByPuuid,
          Object.fromEntries(payload.history_states.map((e) => [e.puuid, e])),
        ),
        summonersByPuuid: stableRecord(
          state.summonersByPuuid,
          mergeSummoners(payload, state.summonersByPuuid, teamPuuids),
        ),
        matchHistoriesByPuuid: stableRecord(
          state.matchHistoriesByPuuid,
          mergeHistories(payload, state.matchHistoriesByPuuid, teamPuuids),
        ),
      };
    });
  },

  applySummonersUpdated: (payload) => {
    set((state) => {
      if (payload.phase === "Idle") {
        return {
          ...state,
          summonerStatesByPuuid: {},
          summonersByPuuid: {},
        };
      }

      const { puuid, summoner } = payload.state;
      const nextSummoners = { ...state.summonersByPuuid };
      if (summoner) {
        nextSummoners[puuid] = summoner;
      } else {
        delete nextSummoners[puuid];
      }

      return {
        ...state,
        summonerStatesByPuuid: {
          ...state.summonerStatesByPuuid,
          [puuid]: payload.state,
        },
        summonersByPuuid: nextSummoners,
      };
    });
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

      const { puuid, games } = payload.state;
      const nextHistories = { ...state.matchHistoriesByPuuid };
      if (games) {
        nextHistories[puuid] = games;
      } else {
        delete nextHistories[puuid];
      }

      return {
        ...state,
        historyStatesByPuuid: {
          ...state.historyStatesByPuuid,
          [puuid]: payload.state,
        },
        matchHistoriesByPuuid: nextHistories,
      };
    });
  },
}));
