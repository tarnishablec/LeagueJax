/** @jsxImportSource solid-js */
import { invoke } from "@tauri-apps/api/core";
import type { OngoingGamePhase } from "@/bindings/ongoing_game";
import { LcuImage } from "@/components/LcuImage";
import { RefreshButton } from "@/components/RefreshButton";
import {
  createListCollection,
  SettingsSelect,
} from "@/components/settings-ui/index";
import { modeOptions } from "@/features/history/components/match-list-options";
import type { MatchModeTag } from "@/features/history/types/match-mode";
import { useSolidLcuMapQuery } from "@/hooks/use-lcu-maps";
import { useSolidTranslation } from "@/i18n/solid";
import { useSolidLcuStore } from "@/stores/lcu.solid";
import { preferredLcuMapAsset } from "@/utils/lcu-map-assets";
import { resolveOwnOngoingTeamSide } from "../routes/ongoing-game.player-utils.ts";
import { useSolidOngoingGameStore } from "../store.solid";
import * as s from "./OngoingGameTitlebar.css";

const CURRENT_MODE_VALUE = "__current_mode__";

function isVisibleOngoingPhase(phase: OngoingGamePhase): boolean {
  return phase === "ChampSelect" || phase === "InGame";
}

function resolveSgpTag(modeTag: MatchModeTag | null): string | null {
  if (modeTag === null) {
    return CURRENT_MODE_VALUE;
  }
  if (modeTag === "all") {
    return null;
  }
  return modeTag;
}

function resolveSelectedValue(
  modeTag: MatchModeTag | null,
  selectableValues: Set<string>,
): string {
  if (modeTag === null) {
    return CURRENT_MODE_VALUE;
  }

  if (selectableValues.has(modeTag)) {
    return modeTag;
  }

  return "all";
}

export function OngoingGameTitlebar() {
  const { t } = useSolidTranslation();
  const phase = useSolidOngoingGameStore((state) => state.phase);
  const isOngoingVisible = () => isVisibleOngoingPhase(phase());
  const modeTag = useSolidOngoingGameStore((state) => state.modeTag);
  const teamMembers = useSolidOngoingGameStore((state) => state.teamMembers);
  const gameflowSession = useSolidOngoingGameStore(
    (state) => state.gameflowSession,
  );
  const champSelectSession = useSolidOngoingGameStore(
    (state) => state.champSelectSession,
  );
  const effectiveQueueId = useSolidOngoingGameStore(
    (state) => state.effectiveQueueId,
  );
  const lcuState = useSolidLcuStore();
  const ownPuuid = () =>
    lcuState()
      .instances.find(
        (instance) => instance.isFocused && instance.state === "ready",
      )
      ?.summoner?.puuid.trim() || null;
  const matchHistoriesPending = useSolidOngoingGameStore((state) =>
    Object.values(state.historyStatesByPuuid).some(
      (historyState) => historyState.status === "loading",
    ),
  );
  const gameflowMap = () => gameflowSession()?.map ?? null;
  const queueAssetMutator = () =>
    gameflowSession()?.gameData.queue.assetMutator ?? "";
  const gameflowMapMutators = () => [
    gameflowMap()?.gameMutator ?? "",
    queueAssetMutator(),
  ];
  const { data: knownMap } = useSolidLcuMapQuery(
    () => gameflowMap()?.id ?? 0,
    gameflowMapMutators,
    () => gameflowMap()?.gameMode ?? "",
  );
  const rawQueueDetailedDescription = () => {
    const session = gameflowSession();
    if (!session) return null;
    // Some queues (e.g., Hextech ARAM, queue 2400) leave detailedDescription
    // empty, so walk the queue -> map chain until a recognizable label exists.
    const candidates = [
      session.gameData.queue.detailedDescription,
      session.gameData.queue.description,
      session.gameData.queue.name,
      session.map.gameModeName,
    ];
    for (const candidate of candidates) {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) return trimmed;
    }
    return null;
  };
  const setModeTag = useSolidOngoingGameStore((state) => state.setModeTag);
  const ownTeamSide = () =>
    resolveOwnOngoingTeamSide({
      phase: phase(),
      teamMembers: teamMembers(),
      gameflowSession: gameflowSession(),
      champSelectSession: champSelectSession(),
      effectiveQueueId: effectiveQueueId(),
      ownPuuid: ownPuuid(),
    });
  const queueIconPath = () => {
    const currentMap = gameflowMap();
    if (!isOngoingVisible() || !currentMap) {
      return null;
    }

    return preferredLcuMapAsset(knownMap()) ?? preferredLcuMapAsset(currentMap);
  };
  const queueDetailedDescription = () =>
    isOngoingVisible() ? rawQueueDetailedDescription() : null;
  const ownTeamSideLabel = () =>
    ownTeamSide() === "blue"
      ? t("ongoingGame.titlebar.sideBlue", { defaultValue: "Blue Side" })
      : ownTeamSide() === "red"
        ? t("ongoingGame.titlebar.sideRed", { defaultValue: "Red Side" })
        : null;
  const currentModeLabel = () =>
    t("ongoingGame.titlebar.filterCurrentMode", {
      defaultValue: "Current Mode",
    });
  const queueGroupLabel = () =>
    t("ongoingGame.titlebar.filterQueueGroup", {
      defaultValue: "Queues",
    });
  const allItems = () => [
    { value: CURRENT_MODE_VALUE, label: currentModeLabel() },
    ...modeOptions.map((option) => ({
      value: option.value,
      label: t(option.labelKey),
    })),
  ];
  const collection = () => createListCollection({ items: allItems() });
  const selectableValues = () => new Set(allItems().map((item) => item.value));
  const groups = () => [
    {
      label: currentModeLabel(),
      items: [{ value: CURRENT_MODE_VALUE, label: currentModeLabel() }],
    },
    {
      label: queueGroupLabel(),
      items: modeOptions.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    },
  ];
  const activeModeTag = () => (isOngoingVisible() ? modeTag() : null);
  const selectedValue = () =>
    resolveSelectedValue(activeModeTag(), selectableValues());

  return (
    <div class={s.root} data-tauri-drag-region hidden={!isOngoingVisible()}>
      <div class={s.labels}>
        <span class={s.queueMeta}>
          {queueIconPath() ? (
            <LcuImage
              src={queueIconPath()}
              alt=""
              className={s.queueIcon}
              fallbackClassName={s.queueIconFallback}
            />
          ) : null}
          <span class={s.queueDesc}>{queueDetailedDescription()}</span>
          {ownTeamSide() && ownTeamSideLabel() ? (
            <span class={s.sideBadge}>
              <span class={s.sideDiamond[ownTeamSide() ?? "blue"]} />
              <span>{ownTeamSideLabel()}</span>
            </span>
          ) : null}
        </span>
      </div>

      <div class={s.controls}>
        <div class={s.filterSelect}>
          <SettingsSelect
            collection={collection()}
            groups={groups()}
            value={[selectedValue()]}
            onValueChange={(details) => {
              const next = details.value[0];
              if (!next) return;
              const nextModeTag =
                next === CURRENT_MODE_VALUE ? null : (next as MatchModeTag);
              const resolvedTag = resolveSgpTag(nextModeTag);

              setModeTag(nextModeTag);
              void invoke("ongoing_game_set_match_history_tag", {
                tag: resolvedTag,
              });
            }}
          />
        </div>

        <RefreshButton
          loading={matchHistoriesPending()}
          ariaLabel={t("ongoingGame.titlebar.refreshAria", {
            defaultValue: "Refresh ongoing game",
          })}
          onClick={() => {
            void invoke("ongoing_game_refresh_match_histories");
          }}
        />
      </div>
    </div>
  );
}
