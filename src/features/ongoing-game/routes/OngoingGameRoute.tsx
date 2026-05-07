import { Swords } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { useSettings } from "@/features/settings/context";
import { FiveVsFiveOngoingLayout } from "../components/layouts/FiveVsFiveOngoingLayout.tsx";
import { MultiTeamOngoingLayout } from "../components/layouts/MultiTeamOngoingLayout.tsx";
import {
  DEFAULT_MIN_SHARED_SQUAD_GAMES,
  type PlayerSquadAssignments,
  resolvePlayerSquadAssignments,
} from "../components/player-card-squads.ts";
import {
  getPlayerCardTagColorSettingItems,
  getPlayerCardTagEnabledSettingItems,
  normalizePlayerCardTagColor,
} from "../components/player-card-tags.ts";
import { useOngoingGameStore } from "../store";
import { resolveOngoingTeamGroups } from "./ongoing-game.player-utils.ts";

const ONGOING_SHOW_BOTS_SETTING = "ongoing.interaction.showBots" as const;
const ONGOING_MATCH_HISTORY_COUNT_SETTING =
  "ongoing.interaction.matchHistoryCount" as const;
const ONGOING_SQUAD_DETECTION_ENABLED_SETTING =
  "ongoing.playerCardTags.squadDetection.enabled" as const;
const ONGOING_SQUAD_DETECTION_MIN_GAMES_SETTING =
  "ongoing.playerCardTags.squadDetectionMinGames" as const;
const PLAYER_CARD_TAG_COLOR_SETTINGS = getPlayerCardTagColorSettingItems();
const PLAYER_CARD_TAG_ENABLED_SETTINGS = getPlayerCardTagEnabledSettingItems();
const EMPTY_SQUAD_ASSIGNMENTS: PlayerSquadAssignments = {
  byPuuid: {},
  squads: [],
};

function createEnabledPlayerCardTagIdsSnapshot(
  settings: ReturnType<typeof useSettings>,
) {
  let previousValues: boolean[] | null = null;
  let previousSnapshot: readonly string[] | null = null;

  return () => {
    const values = PLAYER_CARD_TAG_ENABLED_SETTINGS.map(
      (item) => settings.get<boolean>(item.id) ?? item.defaultEnabled,
    );

    if (
      previousValues &&
      previousSnapshot &&
      values.every((value, index) => value === previousValues?.[index])
    ) {
      return previousSnapshot;
    }

    previousValues = values;
    previousSnapshot = PLAYER_CARD_TAG_ENABLED_SETTINGS.filter(
      (_item, index) => values[index],
    ).map((item) => item.tagId);
    return previousSnapshot;
  };
}

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
  const isSquadDetectionEnabled = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(
        ONGOING_SQUAD_DETECTION_ENABLED_SETTING,
        onStoreChange,
      ),
    () =>
      settings.get<boolean>(ONGOING_SQUAD_DETECTION_ENABLED_SETTING) ?? true,
    () =>
      settings.get<boolean>(ONGOING_SQUAD_DETECTION_ENABLED_SETTING) ?? true,
  );
  const squadDetectionMinGames = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(
        ONGOING_SQUAD_DETECTION_MIN_GAMES_SETTING,
        onStoreChange,
      ),
    () =>
      settings.get<number>(ONGOING_SQUAD_DETECTION_MIN_GAMES_SETTING) ??
      DEFAULT_MIN_SHARED_SQUAD_GAMES,
    () =>
      settings.get<number>(ONGOING_SQUAD_DETECTION_MIN_GAMES_SETTING) ??
      DEFAULT_MIN_SHARED_SQUAD_GAMES,
  );
  const getEnabledPlayerCardTagIdsSnapshot = useMemo(
    () => createEnabledPlayerCardTagIdsSnapshot(settings),
    [settings],
  );
  const enabledPlayerCardTagIds = useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribes = PLAYER_CARD_TAG_ENABLED_SETTINGS.map((item) =>
        settings.subscribe(item.id, onStoreChange),
      );

      return () => {
        for (const unsubscribe of unsubscribes) {
          unsubscribe();
        }
      };
    },
    getEnabledPlayerCardTagIdsSnapshot,
    getEnabledPlayerCardTagIdsSnapshot,
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
  const matchHistoriesByPuuid = useOngoingGameStore(
    (state) => state.matchHistoriesByPuuid,
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
  const squadAssignments = useMemo(() => {
    if (!isSquadDetectionEnabled) {
      return EMPTY_SQUAD_ASSIGNMENTS;
    }

    return resolvePlayerSquadAssignments({
      historiesByPuuid: matchHistoriesByPuuid,
      matchHistoryCount,
      minSharedGames: squadDetectionMinGames,
      teamGroups,
    });
  }, [
    isSquadDetectionEnabled,
    matchHistoriesByPuuid,
    matchHistoryCount,
    squadDetectionMinGames,
    teamGroups,
  ]);

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

  const layoutProps = {
    enabledPlayerCardTagIds,
    matchHistoryCount,
    playerCardTagColors,
    showBots,
    squadAssignments,
    teamGroups,
  };

  if (teamGroups.length > 2) {
    return <MultiTeamOngoingLayout {...layoutProps} />;
  }

  return <FiveVsFiveOngoingLayout {...layoutProps} />;
}
