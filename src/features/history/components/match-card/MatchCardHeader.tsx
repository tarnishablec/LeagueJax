import type { MatchOutcome } from "../../hooks/use-match-card-view-model";
import type { MatchPerformanceBadge } from "../../utils/match-performance-badge";
import * as s from "./MatchCard.css";
import { formatDuration } from "./match-card-display";

export function MatchCardHeader({
  gameResult,
  outcomeLabel,
  placementLabel,
  performanceBadge,
  queueName,
  mapName,
  gameDuration,
  startedAt,
  durationLabel,
  startedAtLabel,
}: {
  gameResult: MatchOutcome;
  outcomeLabel: string;
  placementLabel?: string | null;
  performanceBadge?: MatchPerformanceBadge | null;
  queueName: string;
  mapName: string;
  gameDuration: number;
  startedAt: string;
  durationLabel: string;
  startedAtLabel: string;
}) {
  return (
    <div className={s.headerRow}>
      {placementLabel ? (
        <span className={s.placementPill}>{placementLabel}</span>
      ) : (
        <span className={s.resultPill({ outcome: gameResult })}>
          {outcomeLabel}
        </span>
      )}
      {performanceBadge ? (
        <span className={s.performanceBadge({ badge: performanceBadge })}>
          {performanceBadge.toUpperCase()}
        </span>
      ) : null}
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
