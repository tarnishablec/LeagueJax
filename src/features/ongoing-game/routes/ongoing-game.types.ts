import type { OngoingGameUpdated } from "@/bindings/ongoing_game";

export type PlayerSlot = OngoingGameUpdated["team_members"][number];

export type RecentGameResult = "Win" | "Lose" | "Remake" | "Terminated";
