import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  MatchmakingReadyCheckData,
  MatchmakingSearchData,
} from "@/bindings/lcu_events";
import type { OngoingGameUpdated } from "@/bindings/ongoing_game";
import type { LcuQueue } from "@/bindings/queues";
import { useOngoingGameStore } from "@/features/ongoing-game/store";
import { useSettings } from "@/features/settings/context";
import type { SettingId } from "@/features/settings/types";
import { useLcuMaps } from "@/hooks/use-lcu-maps";
import { useLcuQueues } from "@/hooks/use-lcu-queues";

export type MiniWindowScene = "idle" | "matchmaking" | "ongoing";

export type MiniWindowModel = {
  scene: MiniWindowScene;
  autoAcceptText: string;
  phaseText: string;
  modeName: string | null;
  mapName: string | null;
  mapIconSrc: string | null;
};

const AUTO_ACCEPT_SETTING_ID =
  "matchmaking.interaction.autoAccept" satisfies SettingId;
const ACCEPT_DELAY_SECONDS_SETTING_ID =
  "matchmaking.interaction.acceptDelayMs" satisfies SettingId;

type AutoAcceptSettingsView = {
  enabled: boolean;
  acceptDelaySeconds: number;
};

const MAP_ASSET_KEYS = [
  "game-select-icon-active",
  "game-select-icon-hover",
  "game-select-icon-disabled",
  "icon-v2",
  "icon",
];

function isOngoingScene(phase: OngoingGameUpdated["phase"]): boolean {
  return phase === "ChampSelect" || phase === "InGame";
}

function isMatchmakingScene(phase: OngoingGameUpdated["phase"]): boolean {
  return phase === "Matchmaking" || phase === "ReadyCheck";
}

function toAutoAcceptText(
  autoAccept: AutoAcceptSettingsView,
  phase: OngoingGameUpdated["phase"],
  readyCheck: MatchmakingReadyCheckData | null,
): string {
  if (!autoAccept.enabled) {
    return "Auto accept disabled";
  }

  if (phase !== "ReadyCheck") {
    return "Auto accept enabled";
  }

  if (readyCheck?.state === "EveryoneReady") {
    return "Ready check accepted";
  }

  if (readyCheck?.playerResponse === "Accepted") {
    return "Ready check accepted";
  }

  if (readyCheck?.state === "InProgress") {
    return autoAccept.acceptDelaySeconds > 0
      ? `Auto accept armed (${formatDelaySeconds(autoAccept.acceptDelaySeconds)})`
      : "Auto accept armed";
  }

  return "Auto accept enabled";
}

function formatDelaySeconds(seconds: number): string {
  return `${Number(seconds.toFixed(2))}s`;
}

function useAutoAcceptSettings(): AutoAcceptSettingsView {
  const settings = useSettings();
  const enabled = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(AUTO_ACCEPT_SETTING_ID, onStoreChange),
    () => settings.get<boolean>(AUTO_ACCEPT_SETTING_ID),
    () => settings.get<boolean>(AUTO_ACCEPT_SETTING_ID),
  );
  const delaySeconds = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(ACCEPT_DELAY_SECONDS_SETTING_ID, onStoreChange),
    () => settings.get<number>(ACCEPT_DELAY_SECONDS_SETTING_ID),
    () => settings.get<number>(ACCEPT_DELAY_SECONDS_SETTING_ID),
  );

  return {
    enabled: enabled ?? false,
    acceptDelaySeconds: delaySeconds ?? 0,
  };
}

function toMatchmakingPhaseText(
  phase: OngoingGameUpdated["phase"],
  search: MatchmakingSearchData | null,
  readyCheck: MatchmakingReadyCheckData | null,
): string {
  if (readyCheck?.state === "EveryoneReady") {
    return "Everyone ready";
  }

  if (readyCheck?.state === "InProgress") {
    if (readyCheck.playerResponse === "Accepted") {
      return "Ready check accepted";
    }
    return "Ready check";
  }

  if (search?.searchState === "Found") {
    return "Match found";
  }

  if (search?.searchState === "Searching") {
    return "Searching";
  }

  if (phase === "ReadyCheck") {
    return "Ready check";
  }

  if (phase === "Matchmaking") {
    return "Matchmaking";
  }

  return "Idle";
}

function preferredMapAsset(
  map: { assets: Record<string, unknown> } | null | undefined,
): string | null {
  if (!map) {
    return null;
  }

  for (const key of MAP_ASSET_KEYS) {
    const asset = map.assets[key];
    if (typeof asset === "string" && asset.length > 0) {
      return asset;
    }
  }

  return (
    Object.values(map.assets).find(
      (asset): asset is string => typeof asset === "string" && asset.length > 0,
    ) ?? null
  );
}

function queueNameForId(
  queues: LcuQueue[] | undefined,
  queueId: number | null,
): string | null {
  if (!queues || queueId == null) {
    return null;
  }

  const queue = queues.find((entry) => entry.id === queueId);
  return queue?.shortName ?? queue?.name ?? `Queue ${queueId}`;
}

function resolveModeName(
  queues: LcuQueue[] | undefined,
  queueId: number | null,
  session: OngoingGameUpdated["gameflow_session"],
): string | null {
  return (
    queueNameForId(queues, queueId) ??
    session?.gameData.queue.detailedDescription ??
    session?.gameData.queue.name ??
    session?.map.gameModeName ??
    null
  );
}

export function useMiniWindowModel(): MiniWindowModel {
  const autoAccept = useAutoAcceptSettings();
  const { data: queues } = useLcuQueues();
  const { data: maps } = useLcuMaps();

  const phase = useOngoingGameStore((state) => state.phase);
  const effectiveQueueId = useOngoingGameStore(
    (state) => state.effectiveQueueId,
  );
  const gameflowSession = useOngoingGameStore((state) => state.gameflowSession);
  const matchmakingSearch = useOngoingGameStore(
    (state) => state.matchmakingSearch,
  );
  const readyCheck = useOngoingGameStore((state) => state.readyCheck);

  useEffect(() => {
    void invoke<OngoingGameUpdated>("ongoing_game_get_snapshot")
      .then((snapshot) => {
        useOngoingGameStore.getState().applyUpdated(snapshot);
      })
      .catch(() => {});
  }, []);

  return useMemo(() => {
    const autoAcceptText = toAutoAcceptText(autoAccept, phase, readyCheck);
    const queueId =
      effectiveQueueId ?? gameflowSession?.gameData.queue.id ?? null;
    const sessionMap = gameflowSession?.map ?? null;
    const knownMap = sessionMap
      ? (maps?.find((map) => map.id === sessionMap.id) ?? sessionMap)
      : null;

    if (isOngoingScene(phase)) {
      return {
        scene: "ongoing" as const,
        autoAcceptText,
        phaseText: phase,
        modeName:
          resolveModeName(queues, queueId, gameflowSession) ?? "Ongoing game",
        mapName: sessionMap?.name ?? null,
        mapIconSrc: preferredMapAsset(knownMap),
      };
    }

    if (isMatchmakingScene(phase)) {
      return {
        scene: "matchmaking" as const,
        autoAcceptText,
        phaseText: toMatchmakingPhaseText(phase, matchmakingSearch, readyCheck),
        modeName:
          resolveModeName(queues, queueId, gameflowSession) ?? "Matchmaking",
        mapName: sessionMap?.name ?? null,
        mapIconSrc: preferredMapAsset(knownMap),
      };
    }

    return {
      scene: "idle" as const,
      autoAcceptText,
      phaseText: "Idle",
      modeName: "League Jax",
      mapName: null,
      mapIconSrc: null,
    };
  }, [
    autoAccept,
    effectiveQueueId,
    gameflowSession,
    maps,
    matchmakingSearch,
    phase,
    queues,
    readyCheck,
  ]);
}
