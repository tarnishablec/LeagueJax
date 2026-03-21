import { HoverCard } from "@ark-ui/react/hover-card";
import { Portal } from "@ark-ui/react/portal";
import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import type { SummonerSearchResult } from "@/bindings/summoner.ts";
import { LazyImage } from "@/components/LazyImage";
import { useChampionIcon } from "@/hooks/use-champion-icon";
import { useTabStore } from "@/stores/tabs";
import * as s from "./MatchCard.css";

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

async function searchByQuery(
  query: string,
  sgpServerId: string | null,
): Promise<SummonerSearchResult[]> {
  return invoke<SummonerSearchResult[]>("search_summoners", {
    query,
    ...(sgpServerId ? { sgpServerId } : {}),
  });
}

async function resolvePlayerTab(
  participant: RawMatchSummaryParticipant,
  gameName: string,
  tagLine: string,
  sgpServerId: string | null,
): Promise<{ summoner: SummonerSearchResult } | null> {
  if (participant.puuid) {
    try {
      const results = await searchByQuery(participant.puuid, sgpServerId);
      const match = results.find((e) => e.puuid === participant.puuid);
      if (match) return { summoner: match };
    } catch {
      // fallback
    }
  }

  if (tagLine.length > 0) {
    try {
      const results = await searchByQuery(
        `${gameName}#${tagLine}`,
        sgpServerId,
      );
      const match =
        results.find((e) => e.puuid === participant.puuid) ?? results[0];
      if (match) return { summoner: match };
    } catch {
      // fallback
    }
  }

  return null;
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

  const openPlayerTab = async (
    participant: RawMatchSummaryParticipant,
    gameName: string,
    tagLine: string,
  ) => {
    const resolved = await resolvePlayerTab(
      participant,
      gameName,
      tagLine,
      sgpServerId,
    );

    if (resolved) {
      const { summoner } = resolved;
      openTab(
        {
          puuid: summoner.puuid,
          gameName: summoner.gameName,
          tagLine: summoner.tagLine,
          profileIconId: summoner.profileIconId,
          summonerLevel: summoner.summonerLevel,
        },
        summoner.sgpServerId,
      );
    } else {
      openTab(
        {
          puuid: participant.puuid ?? "",
          gameName,
          tagLine,
          profileIconId: 0,
          summonerLevel: 0,
        },
        sgpServerId,
      );
    }
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
          {members.map((participant) => {
            const { gameName, tagLine } = resolvePlayerName(participant);
            const fullName = tagLine ? `${gameName}#${tagLine}` : gameName;

            return (
              <div
                key={`${participant.puuid}-${participant.championId}`}
                className={s.playerRow}
              >
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
