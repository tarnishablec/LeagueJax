/** @jsxImportSource solid-js */
import { createMemo } from "solid-js";
import type { OpggFiltersDto } from "@/bindings/opgg";
import { RefreshButton } from "@/components/RefreshButton";
import { createListCollection, SettingsSelect } from "@/components/settings-ui";
import { useSolidTranslation } from "@/i18n/solid";
import {
  isOpggRankTier,
  isOpggRegion,
  OPGG_RANK_TIERS,
  OPGG_REGIONS,
} from "../filters";
import * as s from "./ChampionFilters.css";

export function ChampionFilters(props: {
  value: OpggFiltersDto;
  onValueChange: (value: OpggFiltersDto) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useSolidTranslation();
  const tiers = createMemo(() =>
    createListCollection({
      items: OPGG_RANK_TIERS.map((value) => ({
        value: String(value),
        label: t(`champions.rankTiers.${value}`),
      })),
    }),
  );
  const regions = createMemo(() =>
    createListCollection({
      items: OPGG_REGIONS.map((value) => ({
        value: String(value),
        label: t(`champions.regions.${value}`),
      })),
    }),
  );

  return (
    <div class={s.filters}>
      <SettingsSelect
        ariaLabel="Filter champions by rank"
        name="champions.rankTier"
        collection={tiers()}
        value={[props.value.tier]}
        triggerProps={{
          title: t(`champions.rankTiers.${props.value.tier}`),
        }}
        positioning={{ sameWidth: false }}
        onValueChange={(details) => {
          const tier = details.value[0];
          if (isOpggRankTier(tier))
            props.onValueChange({ ...props.value, tier });
        }}
      />
      <SettingsSelect
        ariaLabel="Filter champions by region"
        name="champions.region"
        collection={regions()}
        value={[props.value.region]}
        triggerProps={{
          title: t(`champions.regions.${props.value.region}`),
        }}
        positioning={{ sameWidth: false }}
        onValueChange={(details) => {
          const region = details.value[0];
          if (isOpggRegion(region))
            props.onValueChange({ ...props.value, region });
        }}
      />
      <RefreshButton
        ariaLabel="Refresh OP.GG champion data"
        loading={props.refreshing}
        minLoadingMs={350}
        onClick={props.onRefresh}
      />
    </div>
  );
}
