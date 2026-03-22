import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import useSWR from "swr";
import type { CherryAugment } from "@/bindings/cherry";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";

const EMPTY_AUGMENTS: CherryAugment[] = [];
const EMPTY_AUGMENT_MAP: Record<number, CherryAugment> = {};

export function useLcuCherryAugments() {
  const focused = useLcuStore(selectIsFocused);

  const { data: augments = EMPTY_AUGMENTS } = useSWR(
    focused ? ["get_cherry_augments", focused.pid] : null,
    ([cmd]) =>
      invoke<CherryAugment[]>(cmd, {
        forceRefresh: false,
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_AUGMENTS,
    },
  );

  const byId = useMemo(() => {
    if (augments.length === 0) {
      return EMPTY_AUGMENT_MAP;
    }
    return augments.reduce<Record<number, CherryAugment>>((acc, augment) => {
      acc[augment.id] = augment;
      return acc;
    }, {});
  }, [augments]);

  return {
    augments,
    byId,
  };
}
