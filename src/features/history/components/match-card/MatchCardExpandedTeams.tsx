import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import * as s from "./MatchCard.css";

function participantRowKey(
  participant: RawMatchSummaryParticipant,
  teamId: number,
  index: number,
): string {
  if (participant.participantId !== null) {
    return `team-${teamId}-pid-${participant.participantId}`;
  }

  return `team-${teamId}-puuid-${participant.puuid ?? "unknown"}-champ-${participant.championId}-idx-${index}`;
}

export function MatchCardExpandedTeams({
  participants,
  csShort,
  blueTeamLabel,
  redTeamLabel,
}: {
  participants: RawMatchSummaryParticipant[];
  csShort: string;
  blueTeamLabel: string;
  redTeamLabel: string;
}) {
  const maxDamage = Math.max(
    1,
    ...participants.map(
      (participant) => participant.totalDamageDealtToChampions,
    ),
  );

  return (
    <div className={s.detail}>
      {[100, 200].map((teamId) => {
        const team = participants.filter(
          (participant) => participant.teamId === teamId,
        );

        return (
          <div key={teamId}>
            <div className={s.teamHeader}>
              {teamId === 100 ? blueTeamLabel : redTeamLabel}
            </div>
            {team.map((participant, index) => (
              <div
                key={participantRowKey(participant, teamId, index)}
                className={s.participantRow}
              >
                <ChampionAvatar
                  championId={participant.championId}
                  imageClassName={s.participantIcon}
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
  );
}
