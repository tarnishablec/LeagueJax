/** @jsxImportSource solid-js */
import { type JSX, Show } from "solid-js";
import type {
  OpggChampionDetailDto,
  OpggChampionSummaryDto,
  OpggFiltersDto,
} from "@/bindings/opgg";
import { LazyImage } from "@/components/LazyImage";
import { ScrollArea } from "@/components/scroll-area";
import { useSolidTranslation } from "@/i18n/solid";
import { championIconUrl } from "../assets";
import * as s from "./ChampionDetail.css";
import { ChampionLoadout } from "./ChampionLoadout";
import { ChampionMatchups } from "./ChampionMatchups";
import { ChampionPositionTabs } from "./ChampionPositionTabs";
import * as shared from "./ChampionPresentation.css";
import { ChampionRate } from "./ChampionRate";
import { useChampionLayout } from "./use-champion-layout";

function Stat(props: {
  label: string;
  value: number | undefined;
  neutral?: boolean;
}) {
  return (
    <div class={s.stat}>
      <dt class={shared.sectionLabel}>{props.label}</dt>
      <dd class={s.statValue}>
        <ChampionRate value={props.value} neutral={props.neutral} />
      </dd>
    </div>
  );
}

// Keep the viewport mounted at both sizes so switching scroll ownership does
// not reparent live Solid nodes or reset child state.
function DetailViewport(props: { stacked: boolean; children: JSX.Element }) {
  return (
    <div class={s.scrollFrame({ stacked: props.stacked })}>
      <ScrollArea
        disabled={!props.stacked}
        className={s.scroller}
        contentClassName={s.pageContent({ stacked: props.stacked })}
        viewportClassName={s.viewport}
        direction="vertical"
        mode="outset"
        outsetWidth="12px"
      >
        {props.children}
      </ScrollArea>
    </div>
  );
}

// Two columns use independent panel viewports; a narrow single column expands
// its panels naturally and delegates all vertical scrolling to the page.
export function ChampionDetail(props: {
  champion: OpggChampionSummaryDto | null;
  name: string;
  position: string | null;
  detail: OpggChampionDetailDto | undefined;
  loading: boolean;
  failed: boolean;
  failureMessage: string;
  version: string;
  filters: OpggFiltersDto;
  championName: (id: number) => string;
  itemIcon: (id: number) => string | null;
  spellIcon: (id: number) => string | null;
  onPosition: (position: string) => void;
}) {
  const { t } = useSolidTranslation();
  const layout = useChampionLayout();
  const tier = () => props.detail?.tier || props.champion?.tier;
  return (
    <section ref={layout.ref} class={s.panel} aria-label="Champion details">
      <header class={s.header}>
        <div class={s.identity}>
          <Show
            when={props.champion}
            fallback={<span class={s.portrait} aria-hidden="true" />}
          >
            {(champion) => (
              <LazyImage
                src={championIconUrl(champion().id)}
                alt=""
                className={s.portrait}
                fallbackClassName={s.portrait}
              />
            )}
          </Show>
          <div>
            <div class={s.titleRow}>
              <h2 class={s.title}>{props.name || t("champions.overview")}</h2>
              <Show when={tier()}>
                <span class={s.tier}>
                  {t("champions.tier", { tier: String(tier()) })}
                </span>
              </Show>
            </div>
            <p class={s.source} data-error={props.failed} aria-live="polite">
              {props.failed
                ? props.failureMessage
                : !props.loading && !props.champion
                  ? t("champions.emptyHint")
                  : t("champions.source", {
                      version: props.version || "—",
                      region: t(`champions.regions.${props.filters.region}`),
                      rank: t(`champions.rankTiers.${props.filters.tier}`),
                    })}
            </p>
          </div>
        </div>
        <dl class={s.stats}>
          <Stat
            label={t("champions.winRate")}
            value={props.detail?.winRate ?? props.champion?.winRate}
          />
          <Stat
            label={t("champions.pickRate")}
            value={props.detail?.pickRate ?? props.champion?.pickRate}
            neutral
          />
          <Stat
            label={t("champions.banRate")}
            value={props.detail?.banRate ?? props.champion?.banRate}
            neutral
          />
        </dl>
      </header>
      <Show
        when={props.champion}
        fallback={<div class={s.positionPlaceholder} />}
      >
        {(champion) => (
          <ChampionPositionTabs
            positions={champion().positions.map((entry) => entry.position)}
            value={props.position}
            onValueChange={(value) => {
              if (value) props.onPosition(value);
            }}
            ariaLabel="Champion position"
          />
        )}
      </Show>
      <div class={s.content}>
        <DetailViewport stacked={layout.stacked()}>
          <div
            class={s.body({ stacked: layout.stacked() })}
            aria-busy={props.loading}
          >
            <ChampionLoadout
              flowing={layout.stacked()}
              detail={props.detail}
              loading={props.loading}
              itemIcon={props.itemIcon}
              spellIcon={props.spellIcon}
            />
            <ChampionMatchups
              flowing={layout.stacked()}
              strong={props.detail?.strongAgainst}
              weak={props.detail?.weakAgainst}
              loading={props.loading}
              emptyText={
                props.failed ? props.failureMessage : t("champions.noData")
              }
              championName={props.championName}
            />
          </div>
        </DetailViewport>
      </div>
    </section>
  );
}
