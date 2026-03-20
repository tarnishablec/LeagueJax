import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import useSWR from "swr";
import type { CherryAugment } from "@/bindings/matches.ts";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";

const EMPTY_AUGMENTS: CherryAugment[] = [];
const EMPTY_AUGMENT_MAP: Record<number, CherryAugment> = {};

export function useLcuCherryAugments() {
  const focused = useLcuStore(selectIsFocused);

  const { data: augments = EMPTY_AUGMENTS } = useSWR(
    focused ? ["history:lcu-cherry-augments", focused.pid] : null,
    () =>
      invoke<CherryAugment[]>("get_cherry_augments", {
        forceRefresh: false,
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      revalidateOnFocus: false,
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
