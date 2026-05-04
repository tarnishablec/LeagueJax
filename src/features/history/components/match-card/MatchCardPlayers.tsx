import { useMemo } from "react";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { LazyImage } from "@/components/LazyImage";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import * as s from "./MatchCard.css";
import { MatchCardPlayerNameButton } from "./MatchCardPlayerNameButton";

function PlayerIcon({ championId }: { championId: number }) {
  const iconUrl = useChampionIcon(championId);

  if (!iconUrl) {
    return <span className={s.playerIconFallback} aria-hidden="true" />;
  }

  return (
    <LazyImage
      src={iconUrl}
      alt=""
      className={s.playerIcon}
      fallbackClassName={s.playerIconFallback}
    />
  );
}

export function MatchCardPlayers({
  participants,
  sgpServerId,
}: {
  participants: RawMatchSummaryParticipant[];
  sgpServerId: string | null;
}) {
  const teams = useMemo(() => {
    const map = new Map<number, RawMatchSummaryParticipant[]>();
    for (const p of participants) {
      const team = p.teamId ?? 0;
      let list = map.get(team);
      if (!list) {
        list = [];
        map.set(team, list);
      }
      list.push(p);
    }
    return [...map.entries()];
  }, [participants]);

  return (
    <div className={s.playersPanel}>
      {teams.map(([teamId, members]) => (
        <div key={teamId} className={s.playerTeamColumn}>
          {members.map((participant, index) => {
            return (
              <div
                key={`${participant.puuid}-${participant.championId}-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: the same champion can be on the same team multiple times
                  index
                }`}
                className={s.playerRow}
              >
                <PlayerIcon championId={participant.championId} />
                <MatchCardPlayerNameButton
                  participant={participant}
                  sgpServerId={sgpServerId}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
