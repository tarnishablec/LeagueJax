import { HoverCard } from "@ark-ui/react/hover-card";
import { Portal } from "@ark-ui/react/portal";
import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import type { MatchSummaryParticipant } from "@/bindings/matches.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import { useTabStore } from "@/stores/tabs";
import * as s from "./MatchCard.css";

function resolvePlayerName(participant: MatchSummaryParticipant): {
  gameName: string;
  tagLine: string;
} {
  const gameName = participant.gameName.trim();
  const tagLine = participant.tagLine.trim();

  return {
    gameName: gameName.length > 0 ? gameName : participant.puuid,
    tagLine,
  };
}

function PlayerIcon({ championId }: { championId: number }) {
  const iconUrl = useChampionIcon(championId);

  if (!iconUrl) {
    return <span className={s.playerIconFallback} aria-hidden="true" />;
  }

  return <img src={iconUrl} alt="" className={s.playerIcon} />;
}

export function MatchCardPlayers({
  participants,
}: {
  participants: MatchSummaryParticipant[];
}) {
  const openTab = useTabStore((state) => state.openTab);

  const openPlayerTab = async (
    participant: MatchSummaryParticipant,
    gameName: string,
    tagLine: string,
  ) => {
    try {
      const summoner = await invoke<SummonerInfo>("get_summoner_by_puuid", {
        puuid: participant.puuid,
      });
      openTab(summoner);
      return;
    } catch {
      // fallback to name + tag search below
    }

    if (tagLine.length > 0) {
      try {
        const summoner = await invoke<SummonerInfo>("search_summoner", {
          gameName,
          tagLine,
        });
        openTab(summoner);
        return;
      } catch {
        // fallback below
      }
    }

    openTab({
      puuid: participant.puuid,
      gameName,
      tagLine,
      profileIconId: 0,
      summonerLevel: 0,
    });
  };

  const participantsByTeam = useMemo(
    () => ({
      100: participants.filter((participant) => participant.teamId === 100),
      200: participants.filter((participant) => participant.teamId === 200),
    }),
    [participants],
  );

  return (
    <div className={s.playersPanel}>
      {[100, 200].map((teamId) => (
        <div key={teamId} className={s.playerTeamColumn}>
          {/*<div className={s.playerTeamHeader}>*/}
          {/*  {teamId === 100 ? t("history.blueTeam") : t("history.redTeam")}*/}
          {/*</div>*/}
          {participantsByTeam[teamId as 100 | 200].map((participant) => {
            const { gameName, tagLine } = resolvePlayerName(participant);
            const fullName = tagLine ? `${gameName}#${tagLine}` : gameName;

            return (
              <div key={participant.puuid} className={s.playerRow}>
                <PlayerIcon championId={participant.championId} />
                <HoverCard.Root openDelay={100} closeDelay={60}>
                  <HoverCard.Trigger
                    type="button"
                    aria-label="Open player history tab"
                    className={s.playerNameButton}
                    onClick={() => {
                      void openPlayerTab(participant, gameName, tagLine);
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
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
