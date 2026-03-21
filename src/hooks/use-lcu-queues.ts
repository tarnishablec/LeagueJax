import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { LcuQueue } from "@/bindings/queues";
import { selectIsFocused, useLcuStore } from "@/stores/lcu.ts";

export function useLcuQueues() {
  const connected = useLcuStore(selectIsFocused);

  return useSWR(
    connected ? ["get_lcu_queues"] : null,
    ([cmd]) => invoke<LcuQueue[]>(cmd),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}

export function useLcuQueueName(queueId: number): string | undefined {
  const { data: queues } = useLcuQueues();
  return queues?.find((q) => q.id === queueId)?.shortName;
}
