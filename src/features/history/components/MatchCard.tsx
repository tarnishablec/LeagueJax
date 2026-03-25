import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import {
  OUTCOME_LABEL_KEYS,
  useMatchCardViewModel,
} from "../hooks/use-match-card-view-model";
import * as s from "./MatchCard.css";
import { MatchCardChampionIcon } from "./MatchCardChampionIcon";
import { MatchCardExpandedTeams } from "./MatchCardExpandedTeams";
import { MatchCardHeader } from "./MatchCardHeader";
import { MatchCardLoadout } from "./MatchCardLoadout";
import { MatchCardMetrics } from "./MatchCardMetrics";
import { MatchCardPlayers } from "./MatchCardPlayers";

export function MatchCard({
  match,
  sgpServerId,
  me,
}: {
  me: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const vm = useMatchCardViewModel({ match, me });
  const outcomeLabel = t(OUTCOME_LABEL_KEYS[vm.gameResult], {
    defaultValue: vm.gameResult,
  });
  const csShort = t("history.match.csShort", { defaultValue: "CS" });

  return (
    <div className={s.wrapper}>
      <div className={s.card({ outcome: vm.gameResult })}>
        <button
          type="button"
          className={s.cardMainButton}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <MatchCardChampionIcon
            championId={vm.me.championId}
            className={s.championIcon}
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
              csShort={csShort}
              csPerMinLabel={t("history.match.csPerMin", {
                defaultValue: "CS/min",
              })}
              damageLabel={t("history.match.damage", {
                defaultValue: "Damage",
              })}
              damageShareLabel={t("history.match.damageShare", {
                defaultValue: "Damage Share",
              })}
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
            />
          </div>
        </button>

        <MatchCardPlayers
          participants={vm.participants}
          sgpServerId={sgpServerId}
        />
      </div>

      {expanded && (
        <MatchCardExpandedTeams
          participants={vm.participants}
          csShort={csShort}
          blueTeamLabel={t("history.blueTeam")}
          redTeamLabel={t("history.redTeam")}
        />
      )}
    </div>
  );
}
