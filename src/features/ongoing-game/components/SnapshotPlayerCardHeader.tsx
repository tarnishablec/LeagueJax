import type { SummonerInfo } from "@/bindings/summoner.ts";
import { MiniRankDisplay } from "@/components/mini-rank-display";
import { ProfileIcon } from "@/components/ProfileIcon";
import { SummonerID } from "@/components/SummonerID.tsx";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerCardRankDisplayItem } from "./use-snapshot-player-card-state.ts";

type SnapshotPlayerCardHeaderProps = {
  identity?: Pick<SummonerInfo, "gameName" | "tagLine">;
  isBot: boolean;
  level: number;
  onOpenHistory?: () => void;
  profileIconId: number | null | undefined;
  rankItems: readonly PlayerCardRankDisplayItem[];
  showRank: boolean;
  squadTag?: {
    text: string;
  };
};

export function SnapshotPlayerCardHeader(props: SnapshotPlayerCardHeaderProps) {
  const {
    identity,
    isBot,
    level,
    onOpenHistory,
    profileIconId,
    rankItems,
    showRank,
    squadTag,
  } = props;
  const squadBadge = squadTag ? (
    <span className={s.playerSquadBadge}>{squadTag.text}</span>
  ) : null;

  return (
    <div className={s.playerHeader}>
      <span className={s.playerAvatarWrap}>
        <ProfileIcon
          profileIconId={profileIconId}
          className={s.championAvatar}
          fallbackClassName={s.championAvatarFallback}
        />
        {level > 0 ? <span className={s.levelBadge}>{level}</span> : null}
      </span>

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
                  <button
                    type="button"
                    className={s.playerNameButton}
                    aria-label="Open summoner match history"
                    onClick={onOpenHistory}
                  >
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
                  </button>
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
                      <MiniRankDisplay
                        entry={rank.entry}
                        lpLabel={rank.lpLabel}
                      />
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
