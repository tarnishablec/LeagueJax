import { invoke } from "@tauri-apps/api/core";
import { type Accessor, createMemo } from "solid-js";
import type {
  OpggChampionDetailDto,
  OpggChampionListDto,
  OpggFiltersDto,
} from "@/bindings/opgg";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { createSolidQuery } from "@/infra/solid-query";
import {
  championDetailArgs,
  championDetailKey,
  championListArgs,
  championListKey,
  currentChampionDetail,
  currentChampionList,
} from "./queries";
import {
  DEFAULT_COUNTER_COLUMN_LIMIT,
  OPGG_COUNTER_COLUMN_LIMIT_SETTING,
  parseCounterColumnLimit,
} from "./settings";

// Scope validation belongs to this feature; the generic query runtime only
// handles keys and resources. Guard failed resource reads before inspecting data.
export function useChampionListQuery(
  filters: Accessor<OpggFiltersDto>,
  enabled: Accessor<boolean> = () => true,
) {
  const query = createSolidQuery<OpggChampionListDto>(
    () => (enabled() ? championListKey(filters()) : null),
    (key) =>
      invoke(
        "opgg_list_champions",
        championListArgs(key as ReturnType<typeof championListKey>),
      ),
  );
  const data = createMemo(() =>
    query.error() ? undefined : currentChampionList(query.data(), filters()),
  );

  return {
    ...query,
    data,
    isLoading: () => !query.error() && query.isValidating() && !data(),
  };
}

// Fetch from the immutable request key and reject retained results for another
// champion, position, region, tier, or matchup limit before presentation.
export function useChampionDetailQuery(
  filters: Accessor<OpggFiltersDto>,
  championId: Accessor<number | null>,
  position: Accessor<string | null>,
  enabled: Accessor<boolean> = () => true,
) {
  const counterLimitSetting = useSolidSettingValue<number>(
    OPGG_COUNTER_COLUMN_LIMIT_SETTING,
    DEFAULT_COUNTER_COLUMN_LIMIT,
  );
  const counterColumnLimit = createMemo(
    () =>
      parseCounterColumnLimit(counterLimitSetting()) ??
      DEFAULT_COUNTER_COLUMN_LIMIT,
  );
  const key = createMemo(() =>
    enabled()
      ? championDetailKey(
          filters(),
          championId(),
          position(),
          counterColumnLimit(),
        )
      : null,
  );
  const query = createSolidQuery<OpggChampionDetailDto>(key, (requestKey) =>
    invoke(
      "opgg_get_champion_detail",
      championDetailArgs(
        requestKey as NonNullable<ReturnType<typeof championDetailKey>>,
      ),
    ),
  );
  const data = createMemo(() =>
    query.error()
      ? undefined
      : currentChampionDetail(
          query.data(),
          filters(),
          championId(),
          position(),
          counterColumnLimit(),
        ),
  );

  return { ...query, data };
}
