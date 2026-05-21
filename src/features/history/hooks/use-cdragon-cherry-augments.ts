import { createMemo } from "solid-js";
import { useSolidCdragonGameDataCatalog } from "./use-cdragon-game-data-catalog";

export function useSolidCdragonCherryAugments() {
  const catalog = useSolidCdragonGameDataCatalog();
  const augments = createMemo(() => Object.values(catalog().augmentsById));
  const byId = createMemo(() => catalog().augmentsById);

  return {
    augments,
    byId,
  };
}
