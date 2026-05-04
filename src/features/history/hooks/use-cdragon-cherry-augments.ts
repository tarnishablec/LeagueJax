import { useMemo } from "react";
import { useCdragonGameDataCatalog } from "./use-cdragon-game-data-catalog.ts";

export function useCdragonCherryAugments() {
  const { augmentsById } = useCdragonGameDataCatalog();
  const augments = useMemo(() => Object.values(augmentsById), [augmentsById]);

  return {
    augments,
    byId: augmentsById,
  };
}
