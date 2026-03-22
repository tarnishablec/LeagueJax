import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { LazyImage } from "@/components/LazyImage";
import { useParticipantBrief } from "@/features/history/hooks/use-participant-brief.ts";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import { useLcuMapQuery } from "@/hooks/use-lcu-maps.ts";
import { useLcuQueueName } from "@/hooks/use-lcu-queues.ts";
import * as s from "./MatchCard.css";
import { MatchCardAugments } from "./MatchCardAugments";
import { MatchCardItems } from "./MatchCardItems";
import { MatchCardPlayers } from "./MatchCardPlayers";
import { MatchCardRunes } from "./MatchCardRunes";
import { MatchCardSpells } from "./MatchCardSpells";
import {
  formatDamage,
  formatDuration,
  formatStartTime,
} from "./match-card-display";

type MatchOutcome = "victory" | "defeat" | "remake" | "terminated";

const OUTCOME_LABEL_KEYS: Record<MatchOutcome, string> = {
  victory: "history.victory",
  defeat: "history.defeat",
  remake: "history.remake",
  terminated: "history.terminated",
};

function ChampionIcon({
  championId,
  className,
  fallbackClassName,
}: {
  championId: number;
  className: string;
  fallbackClassName: string;
}) {
  const iconUrl = useChampionIcon(championId);

  if (!iconUrl) {
    return <span className={fallbackClassName} aria-hidden="true" />;
  }

  return (
    <LazyImage
      src={iconUrl}
      alt=""
      className={className}
      fallbackClassName={fallbackClassName}
    />
  );
}

function getPerkIds(me: RawMatchSummaryParticipant): {
  primaryRuneId: number;
  subStyleId: number;
} {
  const styles = me.perks?.styles;
  if (!styles || styles.length < 2) {
    return { primaryRuneId: 0, subStyleId: 0 };
  }
  const primary = styles.find((st) => st.description === "primaryStyle");
  const sub = styles.find((st) => st.description === "subStyle");
  return {
    primaryRuneId: primary?.selections?.[0]?.perk ?? 0,
    subStyleId: sub?.style ?? 0,
  };
}

function computeDamageShare(
  me: RawMatchSummaryParticipant,
  participants: RawMatchSummaryParticipant[],
): number {
  const teamTotal = participants
    .filter((p) => p.teamId === me.teamId)
    .reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
  if (teamTotal === 0) return 0;
  return me.totalDamageDealtToChampions / teamTotal;
}

export function MatchCard({
  match,
  sgpServerId,
  me,
}: {
  me: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();

  const {
    mapId,
    queueId,
    gameModeMutators,
    gameMode,
    gameCreation,
    endOfGameResult,
    gameDuration,
    gameId,
    participants,
  } = match.json;

  const [expanded, setExpanded] = useState(false);

  const { data: map } = useLcuMapQuery(mapId, gameModeMutators, gameMode);
  const queueName = useLcuQueueName(queueId);

  const startedAt = formatStartTime(gameCreation);
  const csShort = t("history.match.csShort", { defaultValue: "CS" });

  const { items, augments, outcome } = useParticipantBrief(me);

  const gameResult: MatchOutcome = endOfGameResult.startsWith("Abort_")
    ? "terminated"
    : outcome;

  const outcomeLabel = t(OUTCOME_LABEL_KEYS[gameResult], {
    defaultValue: gameResult,
  });

  const hasAugments =
    gameMode === "CHERRY" || gameMode === "KIWI" || gameMode === "STRAWBERRY";

  const { primaryRuneId, subStyleId } = getPerkIds(me);

  const damageShare = computeDamageShare(me, participants);

  return (
    <div className={s.wrapper}>
      <div className={s.card({ outcome: gameResult })}>
        <button
          type="button"
          className={s.cardMainButton}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChampionIcon
            championId={me.championId}
            className={s.championIcon}
            fallbackClassName={s.championIconFallback}
          />

          <div className={s.info}>
            <div className={s.headerRow}>
              <span className={s.resultPill({ outcome: gameResult })}>
                {outcomeLabel}
              </span>
              <span className={s.metaPill}>{queueName}</span>
              <span className={s.metaPill}>{map?.name ?? "..."}</span>
              <span className={s.metaPill}>
                {t("history.match.duration", { defaultValue: "Duration" })}{" "}
                {formatDuration(gameDuration)}
              </span>
              <span className={s.metaPill}>
                {t("history.match.startedAt", { defaultValue: "Start" })}{" "}
                {startedAt}
              </span>
            </div>

            <div className={s.metricRow}>
              <div className={s.metricGroup}>
                <span className={s.metricPrimary}>
                  {me.kills ?? 0}/{me.deaths ?? 0}/{me.assists ?? 0}
                </span>
                <span className={s.metricSecondary}>
                  KDA{" "}
                  {(me.deaths ?? 0) === 0
                    ? "Perfect"
                    : (
                        ((me.kills ?? 0) + (me.assists ?? 0)) /
                        (me.deaths ?? 1)
                      ).toFixed(2)}
                </span>
              </div>
              <div className={s.metricGroup}>
                <span className={s.metricPrimary}>
                  {csShort}{" "}
                  {new Intl.NumberFormat().format(
                    me.totalMinionsKilled + me.neutralMinionsKilled,
                  )}
                </span>
                <span className={s.metricSecondary}>
                  {t("history.match.csPerMin", { defaultValue: "CS/min" })}{" "}
                  {gameDuration > 0
                    ? (
                        (me.totalMinionsKilled + me.neutralMinionsKilled) /
                        (gameDuration / 60)
                      ).toFixed(1)
                    : "0.0"}
                </span>
              </div>
              <div className={s.metricGroup}>
                <span className={s.metricPrimary}>
                  {t("history.match.damage", { defaultValue: "Damage" })}{" "}
                  {formatDamage(me.totalDamageDealtToChampions)}
                </span>
                <span className={s.metricSecondary}>
                  {t("history.match.damageShare", {
                    defaultValue: "Damage Share",
                  })}{" "}
                  {`${(damageShare * 100).toFixed(1)}%`}
                </span>
              </div>
            </div>

            <div className={s.loadoutRow}>
              <MatchCardSpells
                spell1Id={me.spell1Id ?? 0}
                spell2Id={me.spell2Id ?? 0}
              />
              {hasAugments ? (
                <MatchCardAugments augmentIds={augments} />
              ) : (
                <MatchCardRunes
                  perkPrimaryRuneId={primaryRuneId}
                  perkSubStyleId={subStyleId}
                />
              )}
              <MatchCardItems gameId={gameId} items={items} />
            </div>
          </div>
        </button>

        <MatchCardPlayers
          participants={participants}
          sgpServerId={sgpServerId}
        />
      </div>

      {expanded && (
        <div className={s.detail}>
          {[100, 200].map((teamId) => {
            const team = participants.filter((p) => p.teamId === teamId);
            const maxDamage = Math.max(
              1,
              ...participants.map((p) => p.totalDamageDealtToChampions),
            );

            return (
              <div key={teamId}>
                <div className={s.teamHeader}>
                  {teamId === 100
                    ? t("history.blueTeam")
                    : t("history.redTeam")}
                </div>
                {team.map((participant) => (
                  <div key={participant.puuid} className={s.participantRow}>
                    <ChampionIcon
                      championId={participant.championId}
                      className={s.participantIcon}
                      fallbackClassName={s.participantIconFallback}
                    />
                    <span>
                      {participant.riotIdGameName || participant.summonerName}
                    </span>
                    <span>
                      {participant.kills ?? 0}/{participant.deaths ?? 0}/
                      {participant.assists ?? 0}
                    </span>
                    <span>
                      {(participant.totalMinionsKilled ?? 0) +
                        (participant.neutralMinionsKilled ?? 0)}{" "}
                      {csShort}
                    </span>
                    <div>
                      <div
                        className={s.damageBar}
                        style={{
                          width: `${(participant.totalDamageDealtToChampions / maxDamage) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
