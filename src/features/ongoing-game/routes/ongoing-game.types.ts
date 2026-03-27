import type {
  OngoingGameMatchHistoryFilter,
  OngoingGameUpdated,
} from "@/bindings/ongoing_game";

export type PlayerSlot = OngoingGameUpdated["team_members"][number];

export type RecentGameResult = "Win" | "Lose" | "Remake" | "Terminated";

export type RecentGameSummary = {
  gameId: number;
  result: RecentGameResult;
  championId: number | null;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  durationSec: number;
};

export type MatchHistoryModeContext = {
  filter: OngoingGameMatchHistoryFilter;
  queueId: number | null;
  mapId: number | null;
  gameMode: string | null;
};
