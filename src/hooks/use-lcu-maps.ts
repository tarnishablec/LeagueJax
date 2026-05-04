import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import type { LcuMap } from "@/bindings/maps";
import { selectIsFocused, useLcuStore } from "@/stores/lcu.ts";
import { normalizeCdragonLocale } from "@/utils/cdragon-locale";

export function useLcuMaps() {
  const connected = useLcuStore(selectIsFocused);
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = useMemo(() => normalizeCdragonLocale(language), [language]);

  return useSWR(
    connected ? (["lcu_get_maps", connected.pid, locale] as const) : null,
    ([cmd, , cdragonLocale]) =>
      invoke<LcuMap[]>(cmd, {
        forceRefresh: false,
        locale: cdragonLocale,
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}

export function useLcuMapQuery(
  mapId: number,
  gameMutators: string[],
  gameMode: string,
) {
  const { data: maps } = useLcuMaps();

  const data = useMemo(() => {
    if (!maps) {
      return undefined;
    }

    const exactModeMatch = maps.find(
      (map) => map.id === mapId && map.gameMode === gameMode,
    );
    if (exactModeMatch) {
      return exactModeMatch;
    }

    const normalizedMutators = gameMutators
      .map((mutator) => mutator.trim().toUpperCase())
      .filter((mutator) => mutator.length > 0);
    if (normalizedMutators.length > 0) {
      const mutatorMatch = maps.find(
        (map) =>
          map.id === mapId &&
          normalizedMutators.includes(map.gameMutator.trim().toUpperCase()),
      );
      if (mutatorMatch) {
        return mutatorMatch;
      }
    }

    return maps.find((map) => map.id === mapId);
  }, [maps, mapId, gameMode, gameMutators]);

  return { data };
}
