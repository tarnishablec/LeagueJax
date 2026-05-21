import { invoke } from "@tauri-apps/api/core";
import { createMemo } from "solid-js";
import type { LcuQueue } from "@/bindings/queues";
import { useSolidTranslation } from "@/i18n/solid";
import { createSolidQuery } from "@/infra/solid-query";
import { selectIsFocused, useSolidLcuStore } from "@/stores/lcu.solid";
import { normalizeCdragonLocale } from "@/utils/cdragon-locale";

type LcuQueuesKey = readonly ["lcu_get_queues", number, string];

export function useSolidLcuQueues() {
  const connected = useSolidLcuStore(selectIsFocused);
  const { language } = useSolidTranslation();
  const locale = createMemo(() => normalizeCdragonLocale(language()));

  return createSolidQuery<LcuQueue[]>(
    () => {
      const focused = connected();
      return focused
        ? (["lcu_get_queues", focused.pid, locale()] as const)
        : null;
    },
    (key) => {
      const [cmd, , cdragonLocale] = key as LcuQueuesKey;
      return invoke<LcuQueue[]>(cmd, {
        forceRefresh: false,
        locale: cdragonLocale,
      });
    },
  );
}

export function useSolidLcuQueueMap() {
  const { data: queues } = useSolidLcuQueues();
  return createMemo(() => {
    const map = new Map<number, string>();
    for (const queue of queues() ?? []) {
      map.set(queue.id, queue.shortName);
    }
    return map;
  });
}

export function useSolidLcuQueueName(queueId: number) {
  const map = useSolidLcuQueueMap();
  return createMemo(() => map().get(queueId));
}
