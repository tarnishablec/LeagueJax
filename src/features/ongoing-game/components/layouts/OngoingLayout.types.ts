import type { PlayerSlot } from "../../routes/ongoing-game.types.ts";
import type { PlayerSquadAssignments } from "../player-card-squads.ts";

export type OngoingTeamGroup = {
  teamId: number;
  members: PlayerSlot[];
};

export type OngoingLayoutProps = {
  enabledPlayerCardTagIds: readonly string[];
  matchHistoryCount: number;
  playerCardTagColors: Readonly<Record<string, string>>;
  showBots: boolean;
  squadAssignments: PlayerSquadAssignments;
  teamGroups: OngoingTeamGroup[];
};
