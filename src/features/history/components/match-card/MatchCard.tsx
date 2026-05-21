/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { useSolidTranslation } from "@/i18n/solid";
import { resolveJungleEggItemIdFromDetails } from "../../hooks/match-details-timeline.ts";
import {
  OUTCOME_LABEL_KEYS,
  useSolidMatchCardViewModel,
} from "../../hooks/use-match-card-view-model";
import { useSolidMatchDetails } from "../../hooks/use-match-details";
import { hasCompletedJungleRoleQuest } from "../../hooks/use-role-quest-slot";
import * as s from "./MatchCard.css";
import { MatchCardExpandedContent } from "./MatchCardExpandedContent";
import { MatchCardHeader } from "./MatchCardHeader";
import { MatchCardLoadout } from "./MatchCardLoadout";
import { MatchCardMetrics } from "./MatchCardMetrics";
import { MatchCardPills } from "./MatchCardPills";
import { MatchCardPlayers } from "./MatchCardPlayers";

export function MatchCard(props: {
  me: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
  sgpServerId: string | null;
  defaultExpanded?: boolean;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const [expanded, setExpanded] = createSignal(props.defaultExpanded ?? false);
  const shouldPreloadDetailsForCompletedJungleQuest =
    hasCompletedJungleRoleQuest(props.me);
  const matchDetails = useSolidMatchDetails(
    () => props.match.json.gameId,
    () => props.sgpServerId,
    () => shouldPreloadDetailsForCompletedJungleQuest,
  );
  const resolvedJungleEggItemId = createMemo(() =>
    resolveJungleEggItemIdFromDetails(
      matchDetails.data(),
      props.me.participantId,
    ),
  );
  const vm = useSolidMatchCardViewModel({
    match: props.match,
    me: props.me,
    resolvedJungleEggItemId,
  });
  const outcomeLabel = () =>
    t(OUTCOME_LABEL_KEYS[vm().gameResult], {
      defaultValue: vm().gameResult,
    });
  const placementLabel = () =>
    vm().isSubteamMatch && vm().placement !== null
      ? (() => {
          const placement = vm().placement ?? 0;
          return t("history.matchDetails.placement", {
            placement,
            defaultValue: `#${placement}`,
          });
        })()
      : null;
  const layout = () => (vm().isSubteamMatch ? "subteam" : "side");

  const toggleExpanded = () => setExpanded((value) => !value);
  const handleMainKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleExpanded();
  };

  createEffect(() => {
    if (
      expanded() &&
      !shouldPreloadDetailsForCompletedJungleQuest &&
      !matchDetails.data() &&
      !matchDetails.error() &&
      !matchDetails.isValidating()
    ) {
      void matchDetails.load();
    }
  });

  return (
    <div class={s.wrapper}>
      <div class={s.card({ outcome: vm().gameResult })}>
        {/* biome-ignore lint/a11y/useSemanticElements: this container includes player name buttons, so a native button would be invalid HTML. */}
        <div
          role="button"
          tabIndex={0}
          class={s.cardMainButton({ layout: layout() })}
          aria-expanded={expanded()}
          onClick={toggleExpanded}
          onKeyDown={handleMainKeyDown}
        >
          <ChampionAvatar
            championId={vm().me.championId}
            wrapperClassName={s.championAvatarSlot({ layout: layout() })}
            imageClassName={s.championIcon}
            fallbackClassName={s.championIconFallback}
          />

          <div class={s.info({ layout: layout() })}>
            <MatchCardHeader
              gameResult={vm().gameResult}
              outcomeLabel={outcomeLabel()}
              placementLabel={placementLabel()}
              queueName={vm().queueName}
              mapName={vm().mapName}
              gameDuration={vm().gameDuration}
              startedAt={vm().startedAt}
              durationLabel={t("history.match.duration", {
                defaultValue: "Duration",
              })}
              startedAtLabel={t("history.match.startedAt", {
                defaultValue: "Start",
              })}
            />

            <MatchCardMetrics
              me={vm().me}
              gameDuration={vm().gameDuration}
              damageShare={vm().damageShare}
              damageRank={vm().damageRank}
              goldRank={vm().goldRank}
              performanceBadge={vm().performanceBadge}
            />

            <MatchCardLoadout
              position={vm().position}
              me={vm().me}
              hasAugments={vm().hasAugments}
              augments={vm().augments}
              primaryRuneId={vm().primaryRuneId}
              subStyleId={vm().subStyleId}
              gameId={vm().gameId}
              items={vm().items}
              questSlot={vm().roleQuestSlot}
            />
          </div>

          <MatchCardPills
            pills={vm().pills}
            className={s.pillsSlot({ layout: layout() })}
          />

          <MatchCardPlayers
            groups={vm().participantGroups}
            sgpServerId={props.sgpServerId}
          />
        </div>
      </div>

      <Show when={expanded()}>
        <MatchCardExpandedContent
          summary={props.match}
          detail={matchDetails.data()}
          detailLoading={matchDetails.isValidating() && !matchDetails.data()}
          sgpServerId={props.sgpServerId}
        />
      </Show>
    </div>
  );
}
