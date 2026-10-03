/** @jsxImportSource solid-js */

import { Collapsible } from "@ark-ui/solid/collapsible";
import { Key } from "@solid-primitives/keyed";
import { Info } from "lucide-solid";
import { createMemo, Match, Show, Switch } from "solid-js";
import type { EnemyChampionPick } from "@/bindings/ongoing_game";
import type { OpggChampionListDto } from "@/bindings/opgg";
import { LazyImage } from "@/components/LazyImage";
import { championIconUrl } from "@/features/opgg/assets";
import { formatRate } from "@/features/opgg/model";
import { useSolidTranslation } from "@/i18n/solid";
import { DEFAULT_CHAMPION_FILTERS } from "../../filters";
import { useChampionDetailQuery } from "../../use-champion-queries";
import {
  type CounterPositionChoice,
  counterSectionState,
  counterWinRate,
  isCounterPosition,
  resolveCounterPosition,
} from "../model";
import * as s from "./CounterPickSection.css.ts";
import { CounterPositionSelect } from "./CounterPositionSelect";

// A full-card disclosure button is a sibling of the content, not its ancestor.
// The lane picker and retry control sit above it and keep independent actions.
export function CounterPickSection(props: {
  pick: EnemyChampionPick;
  nameOf: (championId: number) => string;
  active: boolean;
  expanded: boolean;
  positionChoice: CounterPositionChoice;
  onExpandedChange: (expanded: boolean) => void;
  onPositionChange: (position: CounterPositionChoice) => void;
  championList: OpggChampionListDto | undefined;
  listLoading: boolean;
  listFailed: boolean;
  retryList: () => void;
}) {
  const { t } = useSolidTranslation();
  const position = createMemo(() =>
    resolveCounterPosition(
      props.pick,
      props.championList?.champions,
      props.positionChoice,
    ),
  );
  const inferred = () =>
    props.positionChoice === "auto" && !isCounterPosition(props.pick.position);
  const detailQuery = useChampionDetailQuery(
    () => DEFAULT_CHAMPION_FILTERS,
    () => props.pick.championId,
    position,
    () => props.active && props.expanded,
  );
  const counters = () => detailQuery.data()?.weakAgainst ?? [];
  const state = () =>
    counterSectionState({
      expanded: props.expanded,
      loading:
        (inferred() && props.listLoading) ||
        (!detailQuery.error() &&
          detailQuery.isValidating() &&
          !detailQuery.data()),
      failed: (inferred() && props.listFailed) || Boolean(detailQuery.error()),
      counterCount: counters().length,
    });
  const positionSource = () =>
    props.positionChoice !== "auto"
      ? t("counters.manual")
      : inferred()
        ? t(position() ? "counters.inferred" : "counters.unknownPosition")
        : null;

  return (
    <Collapsible.Root
      class={s.section}
      open={props.expanded}
      onOpenChange={({ open }) => props.onExpandedChange(open)}
    >
      <Collapsible.Trigger
        type="button"
        class={s.toggle}
        aria-label={`${props.expanded ? "Collapse" : "Expand"} counters for enemy slot ${props.pick.cellId}`}
      />
      <div class={s.enemy}>
        <LazyImage
          src={championIconUrl(props.pick.championId)}
          alt=""
          className={s.portrait}
        />
        <div class={s.enemyInfo}>
          <h2 class={s.enemyName}>{props.nameOf(props.pick.championId)}</h2>
          <div class={s.metadata}>
            <Show when={positionSource()}>
              {(source) => <span class={s.muted}>{source()}</span>}
            </Show>
            <Show when={detailQuery.data()}>
              {(detail) => (
                <span class={s.muted}>
                  {t("counters.winRate", {
                    rate: formatRate(detail().winRate),
                  })}
                </span>
              )}
            </Show>
          </div>
        </div>
        <div class={s.positionControl}>
          <CounterPositionSelect
            cellId={props.pick.cellId}
            value={props.positionChoice}
            resolvedPosition={position()}
            onValueChange={props.onPositionChange}
          />
        </div>
      </div>
      <Collapsible.Content class={s.body}>
        <Switch>
          <Match when={state() === "loading"}>
            <p class={s.status}>{t("counters.loading")}</p>
          </Match>
          <Match when={state() === "failed"}>
            <div class={s.status} role="status">
              <span>{t("counters.loadFailed")}</span>
              <button
                type="button"
                class={s.retry}
                aria-label="Retry counter data"
                onClick={() => {
                  if (inferred() && props.listFailed) props.retryList();
                  else void detailQuery.refetch().catch(() => undefined);
                }}
              >
                {t("counters.retry")}
              </button>
            </div>
          </Match>
          <Match when={state() === "empty"}>
            <p class={s.emptyStatus} role="status">
              <Info size={14} aria-hidden="true" />
              <span>{t("counters.insufficient")}</span>
            </p>
          </Match>
          <Match when={state() === "ready"}>
            <Key each={counters()} by={(row) => row.championId}>
              {(row) => {
                const rate = () => counterWinRate(row().winRate);
                return (
                  <div class={s.row}>
                    <LazyImage
                      src={championIconUrl(row().championId)}
                      alt=""
                      className={s.smallPortrait}
                    />
                    <span class={s.name}>{props.nameOf(row().championId)}</span>
                    <span
                      class={`${s.rate} ${rate() >= 0.5 ? s.rateTone.win : s.rateTone.loss}`}
                    >
                      {formatRate(rate())}
                    </span>
                    <span class={s.games}>
                      {t("counters.games", { count: String(row().play) })}
                    </span>
                  </div>
                );
              }}
            </Key>
          </Match>
        </Switch>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
