/** @jsxImportSource solid-js */
import { createMemo, Show } from "solid-js";
import type { OpggCounterDto } from "@/bindings/opgg";
import { AppTooltip } from "@/components/AppTooltip";
import { DataTable, type DataTableColumnDef } from "@/components/DataTable";
import { LazyImage } from "@/components/LazyImage";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import { championIconUrl } from "../assets";
import {
  DEFAULT_COUNTER_COLUMN_LIMIT,
  OPGG_COUNTER_COLUMN_LIMIT_SETTING,
  parseCounterColumnLimit,
} from "../settings";
import * as s from "./ChampionMatchups.css";
import { ChampionPanel } from "./ChampionPanel";
import { ChampionRate } from "./ChampionRate";

// These are presentation slots, not fabricated champion statistics.
type MatchupTableRow = { counter: OpggCounterDto | null };

function MatchupChampion(props: {
  counter: OpggCounterDto | null;
  championName: (id: number) => string;
}) {
  return (
    <Show
      when={props.counter}
      fallback={<span class={s.rowSkeleton} aria-hidden="true" />}
    >
      {(counter) => (
        <AppTooltip content={props.championName(counter().championId)}>
          {(triggerProps) => (
            <div {...triggerProps<HTMLDivElement>({ class: s.champion })}>
              <LazyImage
                src={championIconUrl(counter().championId)}
                alt=""
                className={s.portrait}
                fallbackClassName={s.portrait}
              />
              <span class={s.name}>
                {props.championName(counter().championId)}
              </span>
            </div>
          )}
        </AppTooltip>
      )}
    </Show>
  );
}

// Keep the table, headers and scroll owner mounted; only row cells change state.
// Previous row counts reserve space without retaining another champion's values.
function MatchupTable(props: {
  flowing: boolean;
  title: string;
  ariaLabel: string;
  rows: OpggCounterDto[] | undefined;
  loading: boolean;
  loadingRowCount: number;
  emptyText?: string;
  championName: (id: number) => string;
}) {
  const { t } = useSolidTranslation();
  // Data can clear before loading propagates through the query graph. Only an
  // actual response, including an empty one, may replace the reserved row count.
  const placeholderCount = createMemo<number>((previous) =>
    props.rows === undefined
      ? (previous ?? props.loadingRowCount)
      : Math.max(props.rows.length, 1),
  );
  const rows = createMemo<MatchupTableRow[]>(() =>
    props.loading
      ? Array.from({ length: placeholderCount() }, () => ({ counter: null }))
      : (props.rows?.map((counter) => ({ counter })) ?? []),
  );
  const columns = createMemo<DataTableColumnDef<MatchupTableRow>[]>(() => [
    {
      id: "champion",
      header: t("champions.champion"),
      cell: (context) => (
        <MatchupChampion
          counter={context.row.original.counter}
          championName={props.championName}
        />
      ),
    },
    {
      id: "winRate",
      header: t("champions.winRate"),
      size: 80,
      meta: { className: s.numericCell },
      cell: (context) => (
        <Show when={context.row.original.counter}>
          {(counter) => <ChampionRate value={counter().winRate} />}
        </Show>
      ),
    },
    {
      id: "games",
      header: t("champions.gameCount"),
      size: 65,
      meta: { className: s.numericCell },
      cell: (context) => (
        <Show when={context.row.original.counter}>
          {(counter) => String(counter().play)}
        </Show>
      ),
    },
  ]);
  return (
    <ChampionPanel
      title={props.title}
      ariaLabel={props.ariaLabel}
      flowing={props.flowing}
    >
      <DataTable
        data={rows()}
        columns={columns()}
        getRowClassName={(row) =>
          row.original.counter === null ? s.loadingRow : undefined
        }
        emptyText={props.emptyText ?? t("champions.noData")}
        stickyHeader={!props.flowing}
        scrollbarMode="outset"
      />
    </ChampionPanel>
  );
}

export function ChampionMatchups(props: {
  flowing: boolean;
  strong: OpggCounterDto[] | undefined;
  weak: OpggCounterDto[] | undefined;
  loading: boolean;
  emptyText?: string;
  championName: (id: number) => string;
}) {
  const { t } = useSolidTranslation();
  const counterLimit = useSolidSettingValue<number>(
    OPGG_COUNTER_COLUMN_LIMIT_SETTING,
    DEFAULT_COUNTER_COLUMN_LIMIT,
  );
  const loadingRowCount = () =>
    parseCounterColumnLimit(counterLimit()) ?? DEFAULT_COUNTER_COLUMN_LIMIT;
  return (
    <>
      <MatchupTable
        flowing={props.flowing}
        title={t("champions.strong")}
        ariaLabel="Strong matchups"
        rows={props.strong}
        loading={props.loading}
        loadingRowCount={loadingRowCount()}
        emptyText={props.emptyText}
        championName={props.championName}
      />
      <MatchupTable
        flowing={props.flowing}
        title={t("champions.weak")}
        ariaLabel="Weak matchups"
        rows={props.weak}
        loading={props.loading}
        loadingRowCount={loadingRowCount()}
        emptyText={props.emptyText}
        championName={props.championName}
      />
    </>
  );
}
