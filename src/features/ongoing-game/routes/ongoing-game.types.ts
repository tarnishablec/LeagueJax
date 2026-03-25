import type {
  OngoingGameMatchHistoryFilter,
  OngoingGamePlayerSnapshot,
  PlayerSlot,
} from "@/bindings/ongoing_game";

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

export type TeamCardEntry =
  | {
      kind: "player";
      key: string;
      player: OngoingGamePlayerSnapshot;
      championId: number | null;
      isBot: boolean;
    }
  | {
      kind: "slot";
      key: string;
      slot: PlayerSlot;
      isBot: boolean;
    };
