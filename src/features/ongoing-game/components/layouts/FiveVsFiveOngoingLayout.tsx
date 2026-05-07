import { normalizeTeamId } from "../../routes/ongoing-game.player-utils.ts";
import { TeamRow } from "../OngoingGameCards.tsx";
import * as s from "./FiveVsFiveOngoingLayout.css.ts";
import type { OngoingLayoutProps } from "./OngoingLayout.types.ts";

export function FiveVsFiveOngoingLayout(props: OngoingLayoutProps) {
  const {
    enabledPlayerCardTagIds,
    matchHistoryCount,
    playerCardTagColors,
    showBots,
    squadAssignments,
    teamGroups,
  } = props;
  const shouldOffsetSingleRedTeam =
    teamGroups.length === 1 &&
    normalizeTeamId(teamGroups[0]?.teamId ?? 0) === 2;

  return (
    <div className={s.page}>
      {shouldOffsetSingleRedTeam ? <div className={s.rowSpacer} /> : null}
      {teamGroups.map((group) => (
        <TeamRow
          key={`team:${normalizeTeamId(group.teamId)}`}
          enabledPlayerCardTagIds={enabledPlayerCardTagIds}
          matchHistoryCount={matchHistoryCount}
          minimumColumns={5}
          playerCardTagColors={playerCardTagColors}
          showBots={showBots}
          squadAssignments={squadAssignments}
          slots={group.members}
        />
      ))}
    </div>
  );
}
