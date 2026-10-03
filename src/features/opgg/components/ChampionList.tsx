/** @jsxImportSource solid-js */
import { RadioGroup } from "@ark-ui/solid/radio-group";
import { Key } from "@solid-primitives/keyed";
import { SearchX, TriangleAlert } from "lucide-solid";
import { For, Match, Switch } from "solid-js";
import type { OpggChampionSummaryDto, OpggFiltersDto } from "@/bindings/opgg";
import { AppTooltip } from "@/components/AppTooltip";
import { IconTitleSubtitleState } from "@/components/IconTitleSubtitleState";
import { LazyImage } from "@/components/LazyImage";
import { ScrollArea } from "@/components/scroll-area";
import { SettingsInput } from "@/components/settings-ui";
import { useSolidTranslation } from "@/i18n/solid";
import { visuallyHidden } from "@/styles/accessibility.css";
import { championIconUrl } from "../assets";
import { CHAMPION_POSITIONS, laneStats } from "../model";
import { ChampionFilters } from "./ChampionFilters";
import * as s from "./ChampionList.css";
import { ChampionPositionTabs } from "./ChampionPositionTabs";
import * as shared from "./ChampionPresentation.css";
import { ChampionRate } from "./ChampionRate";

export function ChampionList(props: {
  champions: OpggChampionSummaryDto[];
  selectedId: number | null;
  query: string;
  lane: string | null;
  filters: OpggFiltersDto;
  loading: boolean;
  failed: boolean;
  refreshing: boolean;
  championName: (id: number) => string;
  onQuery: (value: string) => void;
  onLane: (value: string | null) => void;
  onFiltersChange: (filters: OpggFiltersDto) => void;
  onRefresh: () => void;
  onSelect: (id: number) => void;
}) {
  const { t } = useSolidTranslation();
  return (
    <section class={s.panel} aria-label="Champion selection">
      <div class={s.header}>
        <div class={s.titleRow}>
          <h1 class={s.title}>{t("champions.title")}</h1>
          <span class={shared.muted}>
            {props.loading ? "—" : props.champions.length}
          </span>
        </div>
        <SettingsInput
          name="champions.search"
          className={s.search}
          type="text"
          ariaLabel="Search champions"
          value={props.query}
          placeholder={t("champions.search")}
          onValueChange={props.onQuery}
        />
        <ChampionFilters
          value={props.filters}
          onValueChange={props.onFiltersChange}
          refreshing={props.refreshing}
          onRefresh={props.onRefresh}
        />
        <ChampionPositionTabs
          positions={CHAMPION_POSITIONS}
          value={props.lane}
          onValueChange={props.onLane}
          includeAll
          compact
          ariaLabel="Filter champions by position"
        />
      </div>
      <ScrollArea
        className={s.scroller}
        contentClassName={s.content}
        direction="vertical"
        mode="outset"
        outsetWidth="12px"
      >
        <Switch>
          <Match when={props.loading}>
            <div
              class={s.list}
              role="status"
              aria-busy="true"
              aria-label="Loading champions"
            >
              <For each={Array.from({ length: 12 })}>
                {() => (
                  <div class={s.skeletonRow} aria-hidden="true">
                    <span class={`${s.portrait} ${shared.skeleton}`} />
                    <span class={`${s.skeletonText} ${shared.skeleton}`} />
                    <span class={`${s.skeletonText} ${shared.skeleton}`} />
                  </div>
                )}
              </For>
            </div>
          </Match>
          <Match when={props.failed}>
            <IconTitleSubtitleState
              icon={TriangleAlert}
              title={t("champions.loadFailed")}
            />
          </Match>
          <Match when={props.champions.length === 0}>
            <IconTitleSubtitleState
              icon={SearchX}
              title={t("champions.empty")}
            />
          </Match>
          <Match when={props.champions.length > 0}>
            <RadioGroup.Root
              class={s.list}
              orientation="vertical"
              aria-label="Champions"
              value={
                props.selectedId === null ? null : String(props.selectedId)
              }
              onValueChange={(details) => {
                if (details.value) props.onSelect(Number(details.value));
              }}
            >
              <RadioGroup.Label class={visuallyHidden}>
                Champions
              </RadioGroup.Label>
              <Key each={props.champions} by="id">
                {(champion) => (
                  <RadioGroup.Item class={s.row} value={String(champion().id)}>
                    <LazyImage
                      src={championIconUrl(champion().id)}
                      alt=""
                      className={s.portrait}
                      fallbackClassName={`${s.portrait} ${shared.skeleton}`}
                    />
                    {/* Separate nodes preserve both the radio label ID and the tooltip trigger ID. */}
                    <RadioGroup.ItemText class={s.name}>
                      <AppTooltip content={props.championName(champion().id)}>
                        {(triggerProps) => (
                          <span {...triggerProps<HTMLSpanElement>()}>
                            {props.championName(champion().id)}
                          </span>
                        )}
                      </AppTooltip>
                    </RadioGroup.ItemText>
                    <ChampionRate
                      value={
                        (props.lane
                          ? laneStats(champion().positions, props.lane)?.winRate
                          : undefined) ?? champion().winRate
                      }
                    />
                    <RadioGroup.ItemHiddenInput />
                  </RadioGroup.Item>
                )}
              </Key>
            </RadioGroup.Root>
          </Match>
        </Switch>
      </ScrollArea>
    </section>
  );
}
