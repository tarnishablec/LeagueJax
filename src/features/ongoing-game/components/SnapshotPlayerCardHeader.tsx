/** @jsxImportSource solid-js */

import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { MiniRankDisplay } from "@/components/mini-rank-display/MiniRankDisplay";
import { SummonerID } from "@/components/SummonerID";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerCardRankDisplayItem } from "./use-snapshot-player-card-state";

type SnapshotPlayerCardHeaderProps = {
  championId: number | null | undefined;
  identity?: Pick<SummonerInfo, "gameName" | "tagLine">;
  isBot: boolean;
  level: number;
  onOpenHistory?: () => void;
  rankItems: readonly PlayerCardRankDisplayItem[];
  showRank: boolean;
  squadTag?: {
    text: string;
  };
};

export function SnapshotPlayerCardHeader(
  props: SnapshotPlayerCardHeaderProps,
): JSX.Element {
  const showChampionAvatar = () =>
    typeof props.championId === "number" &&
    Number.isFinite(props.championId) &&
    props.championId > 0;
  const rankItems = keyArray(
    () => props.rankItems,
    (rank) => rank.id,
    (rank) => (
      <div class={s.rankItem}>
        <span class={s.rankQueue}>{rank().queueLabel}</span>
        <span class={s.rankValue}>
          <MiniRankDisplay entry={rank().entry} lpLabel={rank().lpLabel} />
        </span>
      </div>
    ),
  );

  return (
    <div class={s.playerHeader}>
      <Show
        when={showChampionAvatar()}
        fallback={
          <span class={s.playerAvatarWrap}>
            <span class={s.playerAvatarPlaceholder} aria-hidden="true" />
            <Show when={props.level > 0}>
              <span class={s.levelBadge}>{props.level}</span>
            </Show>
          </span>
        }
      >
        <ChampionAvatar
          championId={props.championId}
          imageClassName={s.championAvatar}
          fallbackClassName={s.championAvatarFallback}
          wrapperClassName={s.playerAvatarWrap}
          level={props.level}
          levelClassName={s.levelBadge}
        />
      </Show>

      <div class={s.playerIdentity}>
        <Show
          when={!props.isBot}
          fallback={
            <>
              <div class={s.playerNameRow}>
                <span class={s.botLabel}>BOT</span>
                <Show when={props.squadTag}>
                  {(squadTag) => (
                    <span class={s.playerSquadBadge}>{squadTag().text}</span>
                  )}
                </Show>
              </div>
              <div />
            </>
          }
        >
          <div class={s.playerNameRow}>
            <div class={s.playerNameCell}>
              <Show when={props.identity}>
                {(identity) => (
                  <button
                    type="button"
                    class={s.playerNameButton}
                    aria-label="Open summoner match history"
                    onClick={props.onOpenHistory}
                  >
                    <SummonerID
                      summoner={identity()}
                      styles={{
                        gameName: {
                          "font-size": "0.75rem",
                        },
                        tagLine: {
                          "font-size": "0.7rem",
                        },
                      }}
                    />
                  </button>
                )}
              </Show>
            </div>
            <Show when={props.squadTag}>
              {(squadTag) => (
                <span class={s.playerSquadBadge}>{squadTag().text}</span>
              )}
            </Show>
          </div>

          <Show when={props.showRank} fallback={<div />}>
            <div class={s.rankGrid}>{rankItems()}</div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
