/** @jsxImportSource solid-js */
import { createEffect, createMemo, createSignal } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import { useChampionAssets } from "../assets";
import { ChampionDetail } from "../components/ChampionDetail";
import { ChampionList } from "../components/ChampionList";
import { filterChampions, preferredPosition } from "../model";
import { resolveSelectedChampionId } from "../queries";
import { refreshChampionData } from "../refresh";
import { useChampionFilters } from "../use-champion-filters";
import {
  useChampionDetailQuery,
  useChampionListQuery,
} from "../use-champion-queries";
import * as s from "./ChampionsRoute.css";

export default function ChampionsRoute() {
  const { t } = useSolidTranslation();
  const assets = useChampionAssets();
  const [query, setQuery] = createSignal("");
  const [laneFilter, setLaneFilter] = createSignal<string | null>(null);
  const [selectedId, setSelectedId] = createSignal<number | null>(null);
  const [position, setPosition] = createSignal<string | null>(null);
  const { filters, setFilters } = useChampionFilters();
  const [refreshing, setRefreshing] = createSignal(false);
  const listQuery = useChampionListQuery(filters);
  const listData = listQuery.data;
  const champions = createMemo(() => listData()?.champions ?? []);
  const championName = (id: number) => assets().names[id] ?? `#${id}`;
  const visibleChampions = createMemo(() =>
    filterChampions(champions(), query(), laneFilter(), championName),
  );
  const selected = createMemo(
    () => champions().find((champion) => champion.id === selectedId()) ?? null,
  );

  createEffect(() => {
    const rows = listData() ? visibleChampions() : undefined;
    setSelectedId(resolveSelectedChampionId(selectedId(), rows));
  });

  createEffect(() => {
    const champion = selected();
    if (!champion) return;
    const current = position();
    if (
      current &&
      champion.positions.some((entry) => entry.position === current)
    )
      return;
    setPosition(preferredPosition(champion.positions));
  });

  createEffect(() => {
    const filter = laneFilter();
    const champion = selected();
    if (!champion || !filter) return;
    if (champion.positions.some((entry) => entry.position === filter))
      setPosition(filter);
  });

  const detailQuery = useChampionDetailQuery(
    filters,
    () => selected()?.id ?? null,
    position,
  );
  const detail = detailQuery.data;
  const listLoading = listQuery.isLoading;

  const refresh = async () => {
    if (refreshing()) return;
    setRefreshing(true);
    try {
      await refreshChampionData(listQuery.refetch, detailQuery.refetch);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div class={s.page}>
      <ChampionList
        champions={visibleChampions()}
        selectedId={selectedId()}
        query={query()}
        lane={laneFilter()}
        filters={filters()}
        loading={listLoading()}
        failed={Boolean(listQuery.error())}
        championName={championName}
        onQuery={setQuery}
        onLane={setLaneFilter}
        onFiltersChange={setFilters}
        refreshing={
          refreshing() || listQuery.isValidating() || detailQuery.isValidating()
        }
        onRefresh={() => void refresh()}
        onSelect={setSelectedId}
      />
      <ChampionDetail
        champion={selected()}
        name={selected() ? championName(selected()?.id ?? 0) : ""}
        position={position()}
        detail={detail()}
        loading={Boolean(
          listLoading() ||
            (selected() && detailQuery.isValidating() && !detail()),
        )}
        failed={Boolean(
          listQuery.error() || (selected() && detailQuery.error()),
        )}
        failureMessage={t(
          listQuery.error() ? "champions.loadFailed" : "champions.detailFailed",
        )}
        version={listData()?.version ?? ""}
        filters={filters()}
        championName={championName}
        itemIcon={(id) => assets().itemIcons[id] ?? null}
        spellIcon={(id) => assets().spellIcons[id] ?? null}
        onPosition={setPosition}
      />
    </div>
  );
}
