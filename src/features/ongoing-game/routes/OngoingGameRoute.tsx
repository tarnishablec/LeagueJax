import { Swords } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { useSettings } from "@/features/settings/context";
import { TeamRow } from "../components/OngoingGameCards.tsx";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameRoute.css";
import { resolveOngoingTeamGroups } from "./ongoing-game.player-utils.ts";

const ONGOING_SHOW_BOTS_SETTING = "ongoing.behavior.showBots" as const;
const ONGOING_MATCH_HISTORY_COUNT_SETTING =
  "ongoing.behavior.matchHistoryCount" as const;

export function OngoingGameRoute() {
  const { t } = useTranslation();
  const settings = useSettings();
  const showBots = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(ONGOING_SHOW_BOTS_SETTING, onStoreChange),
    () => settings.get<boolean>(ONGOING_SHOW_BOTS_SETTING) ?? true,
    () => settings.get<boolean>(ONGOING_SHOW_BOTS_SETTING) ?? true,
  );
  const matchHistoryCount = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(ONGOING_MATCH_HISTORY_COUNT_SETTING, onStoreChange),
    () => settings.get<number>(ONGOING_MATCH_HISTORY_COUNT_SETTING) ?? 50,
    () => settings.get<number>(ONGOING_MATCH_HISTORY_COUNT_SETTING) ?? 50,
  );
  const teamMembers = useOngoingGameStore((state) => state.teamMembers);
  const phase = useOngoingGameStore((state) => state.phase);
  const gameflowSession = useOngoingGameStore((state) => state.gameflowSession);
  const champSelectSession = useOngoingGameStore(
    (state) => state.champSelectSession,
  );
  const effectiveQueueId = useOngoingGameStore(
    (state) => state.effectiveQueueId,
  );
  const teamGroups = useMemo(
    () =>
      resolveOngoingTeamGroups({
        phase,
        teamMembers,
        gameflowSession,
        champSelectSession,
        effectiveQueueId,
      }),
    [champSelectSession, effectiveQueueId, gameflowSession, teamMembers],
  );

  if (phase === "Idle") {
    return (
      <IconTitleSubtitleState
        icon={Swords}
        title={t("ongoingGame.idleEmpty", {
          defaultValue: "No ongoing game",
        })}
      />
    );
  }

  const shouldOffsetSingleRedTeam =
    phase === "ChampSelect" &&
    teamGroups.length === 1 &&
    teamGroups[0]?.teamId === 2;

  return (
    <div className={s.page}>
      {shouldOffsetSingleRedTeam ? <div className={s.rowSpacer} /> : null}
      {teamGroups.map((group) => (
        <TeamRow
          key={`team:${group.teamId}`}
          matchHistoryCount={matchHistoryCount}
          showBots={showBots}
          slots={group.members}
        />
      ))}
    </div>
  );
}
