/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { LeaguePositionIcon } from "@/components/league-position/LeaguePositionIcon";
import { useSolidTranslation } from "@/i18n/solid";
import type { RoleQuestSlot } from "../../hooks/use-role-quest-slot";
import * as s from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";
import { MatchCardAugments } from "./MatchCardAugments";
import { MatchCardItems } from "./MatchCardItems";
import { MatchCardRunes } from "./MatchCardRunes";
import { MatchCardSpells } from "./MatchCardSpells";

export function MatchCardLoadout(props: {
  position: string | null;
  me: RawMatchSummaryParticipant;
  hasAugments: boolean;
  augments: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
  primaryRuneId: number;
  subStyleId: number;
  gameId: number;
  items: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
  questSlot: RoleQuestSlot | null;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const itemQuestSlot = () =>
    props.questSlot?.kind === "item" ? props.questSlot : null;

  return (
    <div class={s.loadoutRow}>
      <Show when={props.position}>
        {(position) => (
          <div class={s.positionSlot}>
            <LeaguePositionIcon position={position()} width={23} height={23} />
          </div>
        )}
      </Show>
      <MatchCardSpells
        spell1Id={props.me.spell1Id ?? 0}
        spell2Id={props.me.spell2Id ?? 0}
      />
      <Show
        when={props.hasAugments}
        fallback={
          <MatchCardRunes
            perkPrimaryRuneId={props.primaryRuneId}
            perkSubStyleId={props.subStyleId}
          />
        }
      >
        <MatchCardAugments augmentIds={props.augments} />
      </Show>
      <MatchCardItems gameId={props.gameId} items={props.items} />
      <Show when={props.questSlot}>
        {(questSlot) => (
          <div class={s.loadoutGroup}>
            <Show
              when={questSlot().kind === "quest"}
              fallback={
                <MatchCardAssetIcon
                  src={itemQuestSlot()?.iconUrl}
                  alt={t("history.match.itemAlt", {
                    id: itemQuestSlot()?.itemId ?? 0,
                    defaultValue: `Item ${itemQuestSlot()?.itemId ?? 0}`,
                  })}
                  className={s.itemIcon}
                  fallbackClassName={s.itemIconFallback}
                />
              }
            >
              <MatchCardAssetIcon
                src={questSlot().iconUrl}
                alt=""
                className={s.itemIcon}
                fallbackClassName={s.itemIconFallback}
              />
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
