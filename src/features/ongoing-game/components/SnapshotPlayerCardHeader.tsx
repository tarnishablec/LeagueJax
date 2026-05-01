import type { SummonerInfo } from "@/bindings/summoner.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { SummonerID } from "@/components/SummonerID.tsx";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerCardRankDisplayItem } from "./use-snapshot-player-card-state.ts";

type SnapshotPlayerCardHeaderProps = {
  championId: number | null;
  identity?: Pick<SummonerInfo, "gameName" | "tagLine">;
  isBot: boolean;
  level: number;
  rankItems: readonly PlayerCardRankDisplayItem[];
  showRank: boolean;
  squadTag?: {
    text: string;
  };
};

export function SnapshotPlayerCardHeader(props: SnapshotPlayerCardHeaderProps) {
  const { championId, identity, isBot, level, rankItems, showRank, squadTag } =
    props;
  const squadBadge = squadTag ? (
    <span className={s.playerSquadBadge}>{squadTag.text}</span>
  ) : null;

  return (
    <div className={s.playerHeader}>
      <ChampionAvatar
        championId={championId}
        imageClassName={s.championAvatar}
        fallbackClassName={s.championAvatarFallback}
        wrapperClassName={s.playerAvatarWrap}
        level={level > 0 ? level : undefined}
        levelClassName={s.levelBadge}
      />

      <div className={s.playerIdentity}>
        {isBot ? (
          <>
            <div className={s.playerNameRow}>
              <span className={s.botLabel}>BOT</span>
              {squadBadge}
            </div>
            <div></div>
          </>
        ) : (
          <>
            <div className={s.playerNameRow}>
              <div className={s.playerNameCell}>
                {identity ? (
                  <SummonerID
                    summoner={identity}
                    styles={{
                      gameName: {
                        fontSize: "0.75rem",
                      },
                      tagLine: {
                        fontSize: "0.7rem",
                      },
                    }}
                  />
                ) : null}
              </div>
              {squadBadge}
            </div>

            {showRank ? (
              <div className={s.rankGrid}>
                {rankItems.map((rank) => (
                  <div key={rank.id} className={s.rankItem}>
                    <span className={s.rankQueue}>{rank.queueLabel}</span>
                    <span className={s.rankValue}>
                      <img
                        src={rank.iconUrl}
                        alt=""
                        className={s.rankMiniIcon({
                          ranked: rank.isRanked,
                        })}
                      />
                      {rank.value ? (
                        <span className={s.rankText}>{rank.value}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
