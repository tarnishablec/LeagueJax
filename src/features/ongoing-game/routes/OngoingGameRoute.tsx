import { Swords } from "lucide-react";
import { useSyncExternalStore } from "react";
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
  const { teamMembers, phase, gameflowSession, champSelectSession } =
    useOngoingGameStore();
  const teamGroups = resolveOngoingTeamGroups({
    teamMembers,
    gameflowSession,
    champSelectSession,
  });

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

  return (
    <div className={s.page}>
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
