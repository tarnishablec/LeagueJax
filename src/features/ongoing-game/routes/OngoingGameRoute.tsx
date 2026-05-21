/** @jsxImportSource solid-js */
import { Swords } from "lucide-solid";
import type { Accessor, JSX } from "solid-js";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import type { SettingId } from "@/features/settings/types";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import { FiveVsFiveOngoingLayout } from "../components/layouts/FiveVsFiveOngoingLayout";
import { MultiTeamOngoingLayout } from "../components/layouts/MultiTeamOngoingLayout";
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
import { useSolidOngoingGameStore } from "../store.solid";
import { resolveOngoingTeamGroups } from "./ongoing-game.player-utils.ts";

const ONGOING_SHOW_BOTS_SETTING = "ongoing.interaction.showBots" as SettingId;
const ONGOING_MATCH_HISTORY_COUNT_SETTING =
  "ongoing.interaction.matchHistoryCount" as SettingId;
const ONGOING_SQUAD_DETECTION_ENABLED_SETTING =
  "ongoing.playerCardTags.squadDetection.enabled" as SettingId;
const ONGOING_SQUAD_DETECTION_MIN_GAMES_SETTING =
  "ongoing.playerCardTags.squadDetectionMinGames" as SettingId;
const PLAYER_CARD_TAG_COLOR_SETTINGS = getPlayerCardTagColorSettingItems();
const PLAYER_CARD_TAG_ENABLED_SETTINGS = getPlayerCardTagEnabledSettingItems();
const EMPTY_SQUAD_ASSIGNMENTS: PlayerSquadAssignments = {
  byPuuid: {},
  squads: [],
};

function useSettingsSnapshot<T>(
  ids: readonly SettingId[],
  read: () => T,
): Accessor<T> {
  const settings = useSolidSettings();
  const [snapshot, setSnapshot] = createSignal(read(), { equals: false });
  const refresh = () => {
    setSnapshot(() => read());
  };
  const unsubscribes = ids.map((id) => settings.subscribe(id, refresh));

  onCleanup(() => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  });

  return snapshot;
}

function useEnabledPlayerCardTagIds(): Accessor<readonly string[]> {
  const settings = useSolidSettings();
  return useSettingsSnapshot(
    PLAYER_CARD_TAG_ENABLED_SETTINGS.map((item) => item.id),
    () =>
      PLAYER_CARD_TAG_ENABLED_SETTINGS.filter(
        (item) => settings.get<boolean>(item.id) ?? item.defaultEnabled,
      ).map((item) => item.tagId),
  );
}

function usePlayerCardTagColors(): Accessor<Readonly<Record<string, string>>> {
  const settings = useSolidSettings();
  return useSettingsSnapshot(
    PLAYER_CARD_TAG_COLOR_SETTINGS.map((item) => item.id),
    () =>
      Object.fromEntries(
        PLAYER_CARD_TAG_COLOR_SETTINGS.map((item) => [
          item.tagId,
          normalizePlayerCardTagColor(settings.get(item.id), item.defaultColor),
        ]),
      ),
  );
}

export function OngoingGameRoute(): JSX.Element {
  const { t } = useSolidTranslation();
  const showBots = useSolidSettingValue<boolean>(
    ONGOING_SHOW_BOTS_SETTING,
    true,
  );
  const matchHistoryCount = useSolidSettingValue<number>(
    ONGOING_MATCH_HISTORY_COUNT_SETTING,
    50,
  );
  const isSquadDetectionEnabled = useSolidSettingValue<boolean>(
    ONGOING_SQUAD_DETECTION_ENABLED_SETTING,
    true,
  );
  const squadDetectionMinGames = useSolidSettingValue<number>(
    ONGOING_SQUAD_DETECTION_MIN_GAMES_SETTING,
    DEFAULT_MIN_SHARED_SQUAD_GAMES,
  );
  const enabledPlayerCardTagIds = useEnabledPlayerCardTagIds();
  const playerCardTagColors = usePlayerCardTagColors();
  const teamMembers = useSolidOngoingGameStore((state) => state.teamMembers);
  const phase = useSolidOngoingGameStore((state) => state.phase);
  const gameflowSession = useSolidOngoingGameStore(
    (state) => state.gameflowSession,
  );
  const champSelectSession = useSolidOngoingGameStore(
    (state) => state.champSelectSession,
  );
  const effectiveQueueId = useSolidOngoingGameStore(
    (state) => state.effectiveQueueId,
  );
  const matchHistoriesByPuuid = useSolidOngoingGameStore(
    (state) => state.matchHistoriesByPuuid,
  );
  const teamGroups = createMemo(() =>
    resolveOngoingTeamGroups({
      phase: phase(),
      teamMembers: teamMembers(),
      gameflowSession: gameflowSession(),
      champSelectSession: champSelectSession(),
      effectiveQueueId: effectiveQueueId(),
    }),
  );
  const squadAssignments = createMemo(() => {
    if (!isSquadDetectionEnabled()) {
      return EMPTY_SQUAD_ASSIGNMENTS;
    }

    return resolvePlayerSquadAssignments({
      historiesByPuuid: matchHistoriesByPuuid(),
      matchHistoryCount: matchHistoryCount() ?? 50,
      minSharedGames:
        squadDetectionMinGames() ?? DEFAULT_MIN_SHARED_SQUAD_GAMES,
      teamGroups: teamGroups(),
    });
  });
  const layoutProps = () => ({
    enabledPlayerCardTagIds: enabledPlayerCardTagIds(),
    matchHistoryCount: matchHistoryCount() ?? 50,
    playerCardTagColors: playerCardTagColors(),
    showBots: showBots() ?? true,
    squadAssignments: squadAssignments(),
    teamGroups: teamGroups(),
  });
  const isVisible = () => phase() === "ChampSelect" || phase() === "InGame";

  return (
    <Show
      when={isVisible()}
      fallback={
        <IconTitleSubtitleState
          icon={Swords}
          title={t("ongoingGame.idleEmpty", {
            defaultValue: "No ongoing game",
          })}
        />
      }
    >
      <Show
        when={teamGroups().length > 2}
        fallback={<FiveVsFiveOngoingLayout {...layoutProps()} />}
      >
        <MultiTeamOngoingLayout {...layoutProps()} />
      </Show>
    </Show>
  );
}

export default OngoingGameRoute;
