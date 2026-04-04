import type { SummonerInfo } from "@/bindings/summoner.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { SummonerID } from "@/components/SummonerID.tsx";
import * as s from "./OngoingGameCards.css.ts";

type SnapshotPlayerCardHeaderProps = {
  championId: number | null;
  isBot: boolean;
  level: number;
  rankIcon: string;
  rankText: string;
  summoner?: SummonerInfo;
};

export function SnapshotPlayerCardHeader(props: SnapshotPlayerCardHeaderProps) {
  const { championId, isBot, level, rankIcon, rankText, summoner } = props;

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
            <span className={s.botLabel}>BOT</span>
            <div></div>
          </>
        ) : summoner ? (
          <>
            <SummonerID
              summoner={summoner}
              styles={{
                gameName: {
                  fontSize: "0.75rem",
                },
                tagLine: {
                  fontSize: "0.7rem",
                },
              }}
            />

            <div className={s.rankRow}>
              <img src={rankIcon} alt="" className={s.rankMiniIcon} />
              <span className={s.rankText}>{rankText}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
