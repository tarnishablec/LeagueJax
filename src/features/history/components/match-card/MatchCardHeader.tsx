import type { MatchOutcome } from "../../hooks/use-match-card-view-model";
import * as s from "./MatchCard.css";
import { formatDuration } from "./match-card-display";

export function MatchCardHeader({
  gameResult,
  outcomeLabel,
  queueName,
  mapName,
  gameDuration,
  startedAt,
  durationLabel,
  startedAtLabel,
}: {
  gameResult: MatchOutcome;
  outcomeLabel: string;
  queueName: string;
  mapName: string;
  gameDuration: number;
  startedAt: string;
  durationLabel: string;
  startedAtLabel: string;
}) {
  return (
    <div className={s.headerRow}>
      <span className={s.resultPill({ outcome: gameResult })}>
        {outcomeLabel}
      </span>
      <span className={s.metaPill}>{queueName}</span>
      <span className={s.metaPill}>{mapName}</span>
      <span className={s.metaPill}>
        {durationLabel} {formatDuration(gameDuration)}
      </span>
      <span className={s.metaPill}>
        {startedAtLabel} {startedAt}
      </span>
    </div>
  );
}
