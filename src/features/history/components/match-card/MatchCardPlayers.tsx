import { HoverCard } from "@ark-ui/react/hover-card";
import { Portal } from "@ark-ui/react/portal";
import { useMemo } from "react";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { LazyImage } from "@/components/LazyImage";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import { useTabStore } from "@/stores/tabs";
import * as s from "./MatchCard.css";

const BOT_PUUID = "00000000-0000-0000-0000-000000000000";

function isBot(participant: RawMatchSummaryParticipant): boolean {
  const puuid = participant.puuid?.trim() ?? "";
  return puuid.length === 0 || puuid === BOT_PUUID;
}

function resolvePlayerName(participant: RawMatchSummaryParticipant): {
  gameName: string;
  tagLine: string;
} {
  const gameName = (participant.riotIdGameName ?? "").trim();
  const tagLine = (participant.riotIdTagline ?? "").trim();

  return {
    gameName:
      gameName.length > 0
        ? gameName
        : (participant.summonerName ?? participant.puuid ?? "Unknown"),
    tagLine,
  };
}

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
  const openTab = useTabStore((state) => state.openTab);

  const openPlayerTab = (participant: RawMatchSummaryParticipant) => {
    const { gameName, tagLine } = resolvePlayerName(participant);
    openTab(participant.puuid ?? "", sgpServerId, {
      gameName,
      tagLine,
    });
  };

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
            const { gameName, tagLine } = resolvePlayerName(participant);
            const fullName = tagLine ? `${gameName}#${tagLine}` : gameName;
            const bot = isBot(participant);

            return (
              <div
                key={`${participant.puuid}-${participant.championId}-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: the same champion can be on the same team multiple times
                  index
                }`}
                className={s.playerRow}
              >
                <PlayerIcon championId={participant.championId} />
                {bot ? (
                  <span className={s.playerNameLabel}>{gameName}</span>
                ) : (
                  <HoverCard.Root openDelay={100} closeDelay={60}>
                    <HoverCard.Trigger
                      type="button"
                      aria-label="Open player history tab"
                      className={s.playerNameButton}
                      onClick={() => {
                        openPlayerTab(participant);
                      }}
                    >
                      {gameName}
                    </HoverCard.Trigger>
                    <Portal>
                      <HoverCard.Positioner className={s.playerHoverPositioner}>
                        <HoverCard.Content className={s.playerHoverContent}>
                          {fullName}
                        </HoverCard.Content>
                      </HoverCard.Positioner>
                    </Portal>
                  </HoverCard.Root>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
