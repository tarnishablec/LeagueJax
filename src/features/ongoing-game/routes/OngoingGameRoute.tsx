import { Swords } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { useSettings } from "@/features/settings/context";
import { TeamRow } from "../components/OngoingGameCards.tsx";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameRoute.css";

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
  const { blueSlots, redSlots, bluePlayers, redPlayers, phase } =
    useOngoingGameStore();

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
      <TeamRow showBots={showBots} slots={blueSlots} players={bluePlayers} />
      <TeamRow showBots={showBots} slots={redSlots} players={redPlayers} />
    </div>
  );
}
