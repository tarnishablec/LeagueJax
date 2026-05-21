import { invoke } from "@tauri-apps/api/core";
import { createMemo } from "solid-js";
import type { LcuMap } from "@/bindings/maps";
import { useSolidTranslation } from "@/i18n/solid";
import { createSolidQuery } from "@/infra/solid-query";
import { selectIsFocused, useSolidLcuStore } from "@/stores/lcu.solid";
import { normalizeCdragonLocale } from "@/utils/cdragon-locale";

type LcuMapsKey = readonly ["lcu_get_maps", number, string];

export function useSolidLcuMaps() {
  const connected = useSolidLcuStore(selectIsFocused);
  const { language } = useSolidTranslation();
  const locale = createMemo(() => normalizeCdragonLocale(language()));

  return createSolidQuery<LcuMap[]>(
    () => {
      const focused = connected();
      return focused
        ? (["lcu_get_maps", focused.pid, locale()] as const)
        : null;
    },
    (key) => {
      const [cmd, , cdragonLocale] = key as LcuMapsKey;
      return invoke<LcuMap[]>(cmd, {
        forceRefresh: false,
        locale: cdragonLocale,
      });
    },
  );
}

export function useSolidLcuMapQuery(
  mapId: () => number,
  gameMutators: () => string[],
  gameMode: () => string,
) {
  const { data: maps } = useSolidLcuMaps();

  const data = createMemo(() => {
    const currentMaps = maps();
    if (!currentMaps) {
      return undefined;
    }

    const currentMapId = mapId();
    const currentGameMode = gameMode();
    const exactModeMatch = currentMaps.find(
      (map) => map.id === currentMapId && map.gameMode === currentGameMode,
    );
    if (exactModeMatch) {
      return exactModeMatch;
    }

    const normalizedMutators = gameMutators()
      .map((mutator) => mutator.trim().toUpperCase())
      .filter((mutator) => mutator.length > 0);
    if (normalizedMutators.length > 0) {
      const mutatorMatch = currentMaps.find(
        (map) =>
          map.id === currentMapId &&
          normalizedMutators.includes(map.gameMutator.trim().toUpperCase()),
      );
      if (mutatorMatch) {
        return mutatorMatch;
      }
    }

    return currentMaps.find((map) => map.id === currentMapId);
  });

  return { data };
}
