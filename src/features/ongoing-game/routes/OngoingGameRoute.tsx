import { Swords } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { useSettings } from "@/features/settings/context";
import { TeamRow } from "../components/OngoingGameCards.tsx";
import {
  getPlayerCardTagColorSettingItems,
  normalizeEnabledPlayerCardTagIds,
  normalizePlayerCardTagColor,
  ONGOING_PLAYER_CARD_TAGS_ENABLED_SETTING,
} from "../components/player-card-tags.ts";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameRoute.css";
import {
  normalizeTeamId,
  resolveOngoingTeamGroups,
} from "./ongoing-game.player-utils.ts";

const ONGOING_SHOW_BOTS_SETTING = "ongoing.interaction.showBots" as const;
const ONGOING_MATCH_HISTORY_COUNT_SETTING =
  "ongoing.interaction.matchHistoryCount" as const;
const PLAYER_CARD_TAG_COLOR_SETTINGS = getPlayerCardTagColorSettingItems();

function createPlayerCardTagColorsSnapshot(
  settings: ReturnType<typeof useSettings>,
) {
  let previousValues: string[] | null = null;
  let previousSnapshot: Readonly<Record<string, string>> | null = null;

  return () => {
    const values = PLAYER_CARD_TAG_COLOR_SETTINGS.map((item) =>
      normalizePlayerCardTagColor(settings.get(item.id), item.defaultColor),
    );

    if (
      previousValues &&
      previousSnapshot &&
      values.every((value, index) => value === previousValues?.[index])
    ) {
      return previousSnapshot;
    }

    previousValues = values;
    previousSnapshot = Object.fromEntries(
      PLAYER_CARD_TAG_COLOR_SETTINGS.map((item, index) => [
        item.tagId,
        values[index] ?? item.defaultColor,
      ]),
    );
    return previousSnapshot;
  };
}

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
  const enabledPlayerCardTagIds = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(
        ONGOING_PLAYER_CARD_TAGS_ENABLED_SETTING,
        onStoreChange,
      ),
    () =>
      normalizeEnabledPlayerCardTagIds(
        settings.get(ONGOING_PLAYER_CARD_TAGS_ENABLED_SETTING),
      ),
    () =>
      normalizeEnabledPlayerCardTagIds(
        settings.get(ONGOING_PLAYER_CARD_TAGS_ENABLED_SETTING),
      ),
  );
  const getPlayerCardTagColorsSnapshot = useMemo(
    () => createPlayerCardTagColorsSnapshot(settings),
    [settings],
  );
  const playerCardTagColors = useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribes = PLAYER_CARD_TAG_COLOR_SETTINGS.map((item) =>
        settings.subscribe(item.id, onStoreChange),
      );

      return () => {
        for (const unsubscribe of unsubscribes) {
          unsubscribe();
        }
      };
    },
    getPlayerCardTagColorsSnapshot,
    getPlayerCardTagColorsSnapshot,
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
    [champSelectSession, effectiveQueueId, gameflowSession, teamMembers, phase],
  );

  if (phase !== "ChampSelect" && phase !== "InGame") {
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
    teamGroups.length === 1 &&
    normalizeTeamId(teamGroups[0]?.teamId ?? 0) === 2;

  return (
    <div className={s.page}>
      {shouldOffsetSingleRedTeam ? <div className={s.rowSpacer} /> : null}
      {teamGroups.map((group) => (
        <TeamRow
          key={`team:${normalizeTeamId(group.teamId)}`}
          enabledPlayerCardTagIds={enabledPlayerCardTagIds}
          matchHistoryCount={matchHistoryCount}
          playerCardTagColors={playerCardTagColors}
          showBots={showBots}
          slots={group.members}
        />
      ))}
    </div>
  );
}
