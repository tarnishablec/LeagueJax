import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MatchSummary } from "@/bindings/matches.ts";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import { useMatchDetail } from "../hooks/use-match-detail";
import * as s from "./MatchCard.css";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

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
    return <div className={fallbackClassName} />;
  }

  return <img src={iconUrl} alt="" className={className} />;
}

export function MatchCard({ match }: { match: MatchSummary }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = useMatchDetail(expanded ? match.gameId : null);

  return (
    <div>
      <button
        type="button"
        className={s.card({ win: match.win })}
        onClick={() => setExpanded((v) => !v)}
      >
        <ChampionIcon
          championId={match.championId}
          className={s.championIcon}
          fallbackClassName={s.championIconFallback}
        />
        <div className={s.info}>
          <span className={s.kda}>
            {match.kills}/{match.deaths}/{match.assists}
          </span>
          <span className={s.meta}>
            CS {match.cs} · {formatDuration(match.gameDuration)} ·{" "}
            {match.win ? t("history.victory") : t("history.defeat")}
          </span>
        </div>
        <span className={s.meta}>{formatDate(match.gameCreation)}</span>
      </button>

      {expanded && detail && (
        <div className={s.detail}>
          {[100, 200].map((teamId) => {
            const team = detail.participants.filter((p) => p.teamId === teamId);
            const maxDamage = Math.max(
              ...detail.participants.map((p) => p.totalDamageDealtToChampions),
            );
            return (
              <div key={teamId}>
                <div className={s.teamHeader}>
                  {teamId === 100
                    ? t("history.blueTeam")
                    : t("history.redTeam")}
                </div>
                {team.map((p) => (
                  <div key={p.puuid} className={s.participantRow}>
                    <ChampionIcon
                      championId={p.championId}
                      className={s.participantIcon}
                      fallbackClassName={s.participantIconFallback}
                    />
                    <span>{p.summonerName}</span>
                    <span>
                      {p.kills}/{p.deaths}/{p.assists}
                    </span>
                    <span>{p.cs} CS</span>
                    <div>
                      <div
                        className={s.damageBar}
                        style={{
                          width: `${(p.totalDamageDealtToChampions / maxDamage) * 100}%`,
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
