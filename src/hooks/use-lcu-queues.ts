import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import type { LcuQueue } from "@/bindings/queues";
import { selectIsFocused, useLcuStore } from "@/stores/lcu.ts";
import { normalizeCdragonLocale } from "@/utils/cdragon-locale";

export function useLcuQueues() {
  const connected = useLcuStore(selectIsFocused);
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = useMemo(() => normalizeCdragonLocale(language), [language]);

  return useSWR(
    connected ? (["lcu_get_queues", connected.pid, locale] as const) : null,
    ([cmd, , cdragonLocale]) =>
      invoke<LcuQueue[]>(cmd, {
        forceRefresh: false,
        locale: cdragonLocale,
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}

/** Pre-built id→shortName map; stable reference while the queue list is unchanged. */
export function useLcuQueueMap(): Map<number, string> {
  const { data: queues } = useLcuQueues();
  return useMemo(() => {
    const map = new Map<number, string>();
    if (queues) {
      for (const q of queues) {
        map.set(q.id, q.shortName);
      }
    }
    return map;
  }, [queues]);
}

export function useLcuQueueName(queueId: number): string | undefined {
  const map = useLcuQueueMap();
  return map.get(queueId);
}
