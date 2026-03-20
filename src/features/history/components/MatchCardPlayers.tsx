import { HoverCard } from "@ark-ui/react/hover-card";
import { Portal } from "@ark-ui/react/portal";
import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import type { SummonerSearchResult } from "@/bindings/summoner.ts";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import { useTabStore } from "@/stores/tabs";
import type { MatchSummaryParticipant } from "../types/match-summary";
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
  sgpServerId,
}: {
  participants: MatchSummaryParticipant[];
  sgpServerId: string | null;
}) {
  const openTab = useTabStore((state) => state.openTab);

  const openPlayerTab = async (
    participant: MatchSummaryParticipant,
    gameName: string,
    tagLine: string,
  ) => {
    try {
      const query = participant.puuid;
      const byPuuid = await invoke<SummonerSearchResult[]>("search_summoners", {
        query,
        ...(sgpServerId ? { sgpServerId } : {}),
      });
      const resolved = byPuuid.find(
        (entry) => entry.puuid === participant.puuid,
      );
      if (resolved) {
        openTab(
          {
            puuid: resolved.puuid,
            gameName: resolved.gameName,
            tagLine: resolved.tagLine,
            profileIconId: resolved.profileIconId,
            summonerLevel: resolved.summonerLevel,
          },
          resolved.sgpServerId,
        );
        return;
      }
    } catch {
      // fallback to exact query below
    }

    if (tagLine.length > 0) {
      try {
        const query = `${gameName}#${tagLine}`;
        const byRiotId = await invoke<SummonerSearchResult[]>(
          "search_summoners",
          {
            query,
            ...(sgpServerId ? { sgpServerId } : {}),
          },
        );
        const resolved =
          byRiotId.find((entry) => entry.puuid === participant.puuid) ??
          byRiotId[0];
        if (resolved) {
          openTab(
            {
              puuid: resolved.puuid,
              gameName: resolved.gameName,
              tagLine: resolved.tagLine,
              profileIconId: resolved.profileIconId,
              summonerLevel: resolved.summonerLevel,
            },
            resolved.sgpServerId,
          );
          return;
        }
      } catch {
        // fallback below
      }
    }

    openTab(
      {
        puuid: participant.puuid,
        gameName,
        tagLine,
        profileIconId: 0,
        summonerLevel: 0,
      },
      sgpServerId,
    );
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
