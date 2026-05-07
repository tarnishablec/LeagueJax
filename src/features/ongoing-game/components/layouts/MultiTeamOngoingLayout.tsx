import { TeamRow } from "../OngoingGameCards.tsx";
import * as s from "./MultiTeamOngoingLayout.css.ts";
import type { OngoingLayoutProps } from "./OngoingLayout.types.ts";

export function MultiTeamOngoingLayout(props: OngoingLayoutProps) {
  const {
    enabledPlayerCardTagIds,
    matchHistoryCount,
    playerCardTagColors,
    showBots,
    squadAssignments,
    teamGroups,
  } = props;

  return (
    <div className={s.page}>
      {teamGroups.map((group) => (
        <div key={`team:${group.teamId}`} className={s.teamGroup}>
          <TeamRow
            enabledPlayerCardTagIds={enabledPlayerCardTagIds}
            layout="compact"
            matchHistoryCount={matchHistoryCount}
            minimumColumns={1}
            playerCardTagColors={playerCardTagColors}
            showBots={showBots}
            squadAssignments={squadAssignments}
            slots={group.members}
          />
        </div>
      ))}
    </div>
  );
}
