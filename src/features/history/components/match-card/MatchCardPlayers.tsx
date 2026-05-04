import { assignInlineVars } from "@vanilla-extract/dynamic";
import { LazyImage } from "@/components/LazyImage";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import type { MatchParticipantGroup } from "../../utils/match-participant-groups";
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
  groups,
  sgpServerId,
}: {
  groups: MatchParticipantGroup[];
  sgpServerId: string | null;
}) {
  const layout = groups.some((group) => group.layout === "subteam")
    ? "subteam"
    : "side";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: this wrapper only stops card toggle bubbling; child buttons keep their own semantics.
    <div
      className={s.playersPanel({ layout })}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {groups.map((group) => (
        <div
          key={group.key}
          className={s.playerTeamColumn({ layout })}
          style={assignInlineVars({
            [s.playerTeamAccentVar]: group.accentColor,
          })}
        >
          {group.participants.map((participant, index) => {
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
