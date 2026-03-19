import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MatchSummary } from "@/bindings/matches.ts";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import { useMatchDetail } from "../hooks/use-match-detail";
import * as s from "./MatchCard.css";
import { MatchCardItems } from "./MatchCardItems";
import { MatchCardPlayers } from "./MatchCardPlayers";
import { MatchCardRunes } from "./MatchCardRunes";
import { MatchCardSpells } from "./MatchCardSpells";
import {
  formatDamage,
  formatDamageShare,
  formatDuration,
  formatStartTime,
  normalizeMatchOutcome,
  resolveMapLabel,
  resolveModeLabel,
  resolveOutcomeLabel,
} from "./match-card-display";

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

  return <img src={iconUrl} alt="" className={className} />;
}

export function MatchCard({ match }: { match: MatchSummary }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = useMatchDetail(expanded ? match.gameId : null);

  const modeLabel = resolveModeLabel(t, match.queueId, match.gameMode);
  const mapLabel = resolveMapLabel(t, match.mapId);
  const startedAt = formatStartTime(match.gameCreation);
  const csShort = t("history.match.csShort", { defaultValue: "CS" });
  const outcome = normalizeMatchOutcome(match.outcome, match.win);
  const outcomeLabel = resolveOutcomeLabel(t, match.outcome, match.win);

  return (
    <div className={s.wrapper}>
      <div className={s.card({ outcome })}>
        <button
          type="button"
          className={s.cardMainButton}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChampionIcon
            championId={match.championId}
            className={s.championIcon}
            fallbackClassName={s.championIconFallback}
          />

          <div className={s.info}>
            <div className={s.headerRow}>
              <span className={s.resultPill({ outcome })}>{outcomeLabel}</span>
              <span className={s.metaPill}>{modeLabel}</span>
              <span className={s.metaPill}>{mapLabel}</span>
              <span className={s.metaPill}>
                {t("history.match.duration", { defaultValue: "Duration" })}{" "}
                {formatDuration(match.gameDuration)}
              </span>
              <span className={s.metaPill}>
                {t("history.match.startedAt", { defaultValue: "Start" })}{" "}
                {startedAt}
              </span>
            </div>

            <div className={s.metricRow}>
              <span className={s.kda}>
                {match.kills}/{match.deaths}/{match.assists}
              </span>
              <span className={s.meta}>
                {csShort} {new Intl.NumberFormat().format(match.cs)}
              </span>
              <span className={s.meta}>
                {t("history.match.damage", { defaultValue: "Damage" })}{" "}
                {formatDamage(match.totalDamageDealtToChampions)}
              </span>
              <span className={s.meta}>
                {t("history.match.damageShare", {
                  defaultValue: "Damage Share",
                })}{" "}
                {formatDamageShare(match.damageShare)}
              </span>
            </div>

            <div className={s.loadoutRow}>
              <MatchCardSpells
                spell1Id={match.spell1Id}
                spell2Id={match.spell2Id}
              />
              <MatchCardRunes
                perkPrimaryRuneId={match.perkPrimaryRuneId}
                perkSubStyleId={match.perkSubStyleId}
              />
              <MatchCardItems gameId={match.gameId} items={match.items} />
            </div>
          </div>
        </button>

        <MatchCardPlayers participants={match.participants} />
      </div>

      {expanded && detail && (
        <div className={s.detail}>
          {[100, 200].map((teamId) => {
            const team = detail.participants.filter((participant) => {
              return participant.teamId === teamId;
            });
            const maxDamage = Math.max(
              1,
              ...detail.participants.map(
                (participant) => participant.totalDamageDealtToChampions,
              ),
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
                    <span>{participant.summonerName}</span>
                    <span>
                      {participant.kills}/{participant.deaths}/
                      {participant.assists}
                    </span>
                    <span>
                      {participant.cs} {csShort}
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
