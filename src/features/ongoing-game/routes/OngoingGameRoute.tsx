import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/features/settings/context";
import { useOngoingGameStore } from "../store";
import { TeamRow } from "./components/OngoingGameCards";
import * as s from "./OngoingGameRoute.css";
import type { MatchHistoryModeContext } from "./ongoing-game.types";

const ONGOING_SHOW_BOTS_SETTING = "ongoing.behavior.showBots" as const;

export function OngoingGameRoute() {
  const { t } = useTranslation();
  const settings = useSettings();
  const showBots = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(ONGOING_SHOW_BOTS_SETTING, onStoreChange),
    () => settings.get<boolean>(ONGOING_SHOW_BOTS_SETTING) ?? true,
    () => settings.get<boolean>(ONGOING_SHOW_BOTS_SETTING) ?? true,
  );
  const {
    blueSlots,
    redSlots,
    bluePlayers,
    redPlayers,
    matchHistoryFilter,
    queueId,
    mapId,
    gameMode,
  } = useOngoingGameStore();

  const modeContext: MatchHistoryModeContext = {
    filter: matchHistoryFilter,
    queueId,
    mapId,
    gameMode,
  };

  return (
    <div className={s.page}>
      <TeamRow
        title={t("ongoingGame.blueTeam")}
        titleClassName={s.blueTitle}
        showBots={showBots}
        slots={blueSlots}
        players={bluePlayers}
        modeContext={modeContext}
        noDataText={t("ongoingGame.noData")}
        noRankedText={t("ongoingGame.noRanked")}
        recentGamesText={t("ongoingGame.recentGames")}
        noHistoryText={t("ongoingGame.noHistory", {
          defaultValue: "No match history",
        })}
        botNoHistoryText={t("ongoingGame.botNoHistory", {
          defaultValue: "Bot (history disabled)",
        })}
        csText={t("ongoingGame.cs", { defaultValue: "CS" })}
        levelText={t("ongoingGame.level")}
      />
      <TeamRow
        title={t("ongoingGame.redTeam")}
        titleClassName={s.redTitle}
        showBots={showBots}
        slots={redSlots}
        players={redPlayers}
        modeContext={modeContext}
        noDataText={t("ongoingGame.noData")}
        noRankedText={t("ongoingGame.noRanked")}
        recentGamesText={t("ongoingGame.recentGames")}
        noHistoryText={t("ongoingGame.noHistory", {
          defaultValue: "No match history",
        })}
        botNoHistoryText={t("ongoingGame.botNoHistory", {
          defaultValue: "Bot (history disabled)",
        })}
        csText={t("ongoingGame.cs", { defaultValue: "CS" })}
        levelText={t("ongoingGame.level")}
      />
    </div>
  );
}
