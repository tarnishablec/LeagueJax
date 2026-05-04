import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { resolveJungleEggItemIdFromDetails } from "../../hooks/match-details-timeline.ts";
import {
  OUTCOME_LABEL_KEYS,
  useMatchCardViewModel,
} from "../../hooks/use-match-card-view-model";
import { useMatchDetails } from "../../hooks/use-match-details.ts";
import { hasCompletedJungleRoleQuest } from "../../hooks/use-role-quest-slot.ts";
import * as s from "./MatchCard.css";
import { MatchCardExpandedContent } from "./MatchCardExpandedContent";
import { MatchCardHeader } from "./MatchCardHeader";
import { MatchCardLoadout } from "./MatchCardLoadout";
import { MatchCardMetrics } from "./MatchCardMetrics";
import { MatchCardPills } from "./MatchCardPills";
import { MatchCardPlayers } from "./MatchCardPlayers";

export function MatchCard({
  match,
  sgpServerId,
  me,
  defaultExpanded = false,
}: {
  me: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
  sgpServerId: string | null;
  defaultExpanded?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const shouldPreloadDetailsForCompletedJungleQuest =
    hasCompletedJungleRoleQuest(me);
  const {
    data: matchDetails,
    error: matchDetailsError,
    isValidating: isMatchDetailsValidating,
    load: loadMatchDetails,
  } = useMatchDetails(
    match.json.gameId,
    sgpServerId,
    shouldPreloadDetailsForCompletedJungleQuest,
  );
  const resolvedJungleEggItemId = useMemo(
    () => resolveJungleEggItemIdFromDetails(matchDetails, me.participantId),
    [matchDetails, me.participantId],
  );
  const vm = useMatchCardViewModel({
    match,
    me,
    resolvedJungleEggItemId,
  });
  const outcomeLabel = t(OUTCOME_LABEL_KEYS[vm.gameResult], {
    defaultValue: vm.gameResult,
  });

  useEffect(() => {
    if (
      expanded &&
      !shouldPreloadDetailsForCompletedJungleQuest &&
      !matchDetails &&
      !matchDetailsError &&
      !isMatchDetailsValidating
    ) {
      void loadMatchDetails();
    }
  }, [
    expanded,
    shouldPreloadDetailsForCompletedJungleQuest,
    matchDetails,
    matchDetailsError,
    isMatchDetailsValidating,
    loadMatchDetails,
  ]);

  return (
    <div className={s.wrapper}>
      <div className={s.card({ outcome: vm.gameResult })}>
        <button
          type="button"
          className={s.cardMainButton}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChampionAvatar
            championId={vm.me.championId}
            imageClassName={s.championIcon}
            fallbackClassName={s.championIconFallback}
          />

          <div className={s.info}>
            <MatchCardHeader
              gameResult={vm.gameResult}
              outcomeLabel={outcomeLabel}
              queueName={vm.queueName}
              mapName={vm.mapName}
              gameDuration={vm.gameDuration}
              startedAt={vm.startedAt}
              durationLabel={t("history.match.duration", {
                defaultValue: "Duration",
              })}
              startedAtLabel={t("history.match.startedAt", {
                defaultValue: "Start",
              })}
            />

            <MatchCardMetrics
              me={vm.me}
              gameDuration={vm.gameDuration}
              damageShare={vm.damageShare}
              damageRank={vm.damageRank}
              goldRank={vm.goldRank}
            />

            <MatchCardLoadout
              position={vm.position}
              me={vm.me}
              hasAugments={vm.hasAugments}
              augments={vm.augments}
              primaryRuneId={vm.primaryRuneId}
              subStyleId={vm.subStyleId}
              gameId={vm.gameId}
              items={vm.items}
              questSlot={vm.roleQuestSlot}
            />
          </div>
          <MatchCardPills pills={vm.pills} className={s.pillsSlot} />
        </button>

        <MatchCardPlayers
          participants={vm.participants}
          sgpServerId={sgpServerId}
        />
      </div>

      {expanded && (
        <MatchCardExpandedContent summary={match} detail={matchDetails} />
      )}
    </div>
  );
}
