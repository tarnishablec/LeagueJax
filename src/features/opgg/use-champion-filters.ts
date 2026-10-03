import { createMemo } from "solid-js";
import type { OpggFiltersDto, OpggRankTier, OpggRegion } from "@/bindings/opgg";
import { useSolidSettings } from "@/features/settings/solid-context";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { DEFAULT_CHAMPION_FILTERS } from "./filters";
import {
  championFiltersFromSettings,
  OPGG_RANK_TIER_SETTING,
  OPGG_REGION_SETTING,
} from "./settings";

// The page controls and the settings tab share one source so remounts and
// external setting changes cannot restore a separate page-local selection.
export function useChampionFilters() {
  const settings = useSolidSettings();
  const region = useSolidSettingValue<OpggRegion>(
    OPGG_REGION_SETTING,
    DEFAULT_CHAMPION_FILTERS.region,
  );
  const tier = useSolidSettingValue<OpggRankTier>(
    OPGG_RANK_TIER_SETTING,
    DEFAULT_CHAMPION_FILTERS.tier,
  );
  return {
    filters: createMemo(() => championFiltersFromSettings(region(), tier())),
    setFilters: (next: OpggFiltersDto) => {
      settings.set(OPGG_REGION_SETTING, next.region);
      settings.set(OPGG_RANK_TIER_SETTING, next.tier);
    },
  };
}
