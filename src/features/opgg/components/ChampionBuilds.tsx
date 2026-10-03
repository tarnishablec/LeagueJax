/** @jsxImportSource solid-js */

import { assignInlineVars } from "@vanilla-extract/dynamic";
import { ChevronRight } from "lucide-solid";
import {
  createMemo,
  createSignal,
  Index,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { OpggBuildDto, OpggChampionDetailDto } from "@/bindings/opgg";
import { AppTooltip } from "@/components/AppTooltip";
import { LazyImage } from "@/components/LazyImage";
import { useSolidTranslation } from "@/i18n/solid";
import { resolveSkillOrder } from "../skill-order";
import * as s from "./ChampionBuilds.css";
import * as shared from "./ChampionPresentation.css";
import { ChampionRate } from "./ChampionRate";

// Item wrapping varies with panel width and build size. Reserve the last loaded
// border-box height while one whole-row skeleton replaces those contents.
function useLoadingRowHeight(loading: () => boolean) {
  const [height, setHeight] = createSignal<number>();
  let element: HTMLDivElement | undefined;
  onMount(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || loading()) return;
      const nextHeight = entry.borderBoxSize[0]?.blockSize;
      if (nextHeight !== undefined && nextHeight > 0) setHeight(nextHeight);
    });
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });
  return {
    ref: (node: HTMLDivElement) => {
      element = node;
    },
    style: () =>
      assignInlineVars({
        [s.pendingRowMinHeight]:
          loading() && height() !== undefined ? `${height()}px` : undefined,
      }),
  };
}

function ChampionSkillPriority(props: { skills: string[]; loading: boolean }) {
  const { t } = useSolidTranslation();
  return (
    <div class={s.priority}>
      <span class={shared.sectionLabel}>{t("champions.skillPriority")}</span>
      <div class={s.priorityKeys}>
        <Show
          when={!props.loading}
          fallback={<span class={s.prioritySkeleton} aria-hidden="true" />}
        >
          <Index each={props.skills.length ? props.skills : ["", "", ""]}>
            {(skill, index) => (
              <>
                <Show when={index > 0}>
                  <ChevronRight size={12} aria-hidden="true" />
                </Show>
                <span class={s.skillKey}>{skill() || "—"}</span>
              </>
            )}
          </Index>
        </Show>
      </div>
    </div>
  );
}

function ChampionSkillStep(props: {
  level: number;
  skill: string | null;
  inferred: boolean;
}) {
  const { t } = useSolidTranslation();
  const tooltip = () => {
    const level = String(props.level);
    if (!props.skill) {
      return t("champions.unavailableSkillLevel", { level });
    }
    if (props.inferred) {
      return t("champions.inferredSkillLevel", { level });
    }
    return t("champions.level", { level });
  };

  return (
    <AppTooltip content={tooltip()}>
      {(triggerProps) => (
        <span
          {...triggerProps<HTMLSpanElement>({ class: s.skillStep })}
          data-ultimate={props.skill === "R"}
        >
          <span class={s.level}>{props.level}</span>
          <span>{props.skill || "—"}</span>
        </span>
      )}
    </AppTooltip>
  );
}

export function ChampionSkills(props: {
  detail: OpggChampionDetailDto | undefined;
  loading: boolean;
}) {
  const { t } = useSolidTranslation();
  const skillOrder = createMemo(() =>
    props.detail
      ? resolveSkillOrder(props.detail)
      : Array.from({ length: 18 }, () => null),
  );
  return (
    <div class={s.skills}>
      <ChampionSkillPriority
        skills={props.detail?.skillPriority ?? []}
        loading={props.loading}
      />
      <div class={shared.stack}>
        <span class={shared.sectionLabel}>{t("champions.skillLevels")}</span>
        <section
          class={s.skillOrderFrame}
          aria-label="Skill order by champion level"
        >
          <Show
            when={!props.loading}
            fallback={
              <div class={s.skillOrderSkeleton} aria-hidden="true">
                <span class={s.skillOrderLine} />
                <span class={s.skillOrderLine} />
              </div>
            }
          >
            <div class={s.skillOrder}>
              <Index each={skillOrder()}>
                {(skill, index) => (
                  <ChampionSkillStep
                    level={index + 1}
                    skill={skill()}
                    inferred={index >= (props.detail?.skillOrder.length ?? 0)}
                  />
                )}
              </Index>
            </div>
          </Show>
        </section>
      </div>
      <div class={s.skillStats}>
        <Show
          when={!props.loading}
          fallback={<span class={s.statsSkeleton} aria-hidden="true" />}
        >
          <span>
            <span class={shared.muted}>{t("champions.winRate")} </span>
            <ChampionRate value={props.detail?.skillWinRate} />
          </span>
          <span>
            <span class={shared.muted}>{t("champions.pickRate")} </span>
            <ChampionRate value={props.detail?.skillPickRate} neutral />
          </span>
        </Show>
      </div>
    </div>
  );
}

function ItemIcon(props: { src: string | null }) {
  return (
    <Show
      when={props.src}
      fallback={<span class={s.icon} aria-hidden="true" />}
    >
      {(src) => (
        <LazyImage
          src={src()}
          alt=""
          className={s.icon}
          fallbackClassName={s.icon}
        />
      )}
    </Show>
  );
}

// The row itself is stable; loading replaces the whole plan, not each icon or rate.
function ChampionBuildLine(props: {
  label: string;
  build: OpggBuildDto | undefined;
  icon: (id: number) => string | null;
  loading: boolean;
}) {
  const rowLayout = useLoadingRowHeight(() => props.loading);
  return (
    <div ref={rowLayout.ref} class={s.buildRow} style={rowLayout.style()}>
      <Show
        when={!props.loading}
        fallback={<span class={s.buildRowSkeleton} aria-hidden="true" />}
      >
        <span class={`${shared.sectionLabel} ${s.buildLabel}`}>
          {props.label}
        </span>
        <div class={s.icons}>
          <Show
            when={props.build?.ids.length}
            fallback={<span class={shared.muted}>—</span>}
          >
            <Index each={props.build?.ids ?? []}>
              {(id) => <ItemIcon src={props.icon(id())} />}
            </Index>
          </Show>
        </div>
        <span class={s.buildRate}>
          <ChampionRate value={props.build?.winRate} />
        </span>
      </Show>
    </div>
  );
}

export function ChampionBuilds(props: {
  detail: OpggChampionDetailDto | undefined;
  loading: boolean;
  itemIcon: (id: number) => string | null;
  spellIcon: (id: number) => string | null;
}) {
  const { t } = useSolidTranslation();
  const situationalLayout = useLoadingRowHeight(() => props.loading);
  return (
    <div class={s.content}>
      <div class={s.buildHeading}>
        <span class={shared.sectionLabel}>{t("champions.buildType")}</span>
        <span class={shared.sectionLabel}>{t("champions.winRate")}</span>
      </div>
      <div class={s.builds}>
        <ChampionBuildLine
          label={t("champions.spells")}
          build={props.detail?.summonerSpells[0]}
          icon={props.spellIcon}
          loading={props.loading}
        />
        <ChampionBuildLine
          label={t("champions.starter")}
          build={props.detail?.starterItems[0]}
          icon={props.itemIcon}
          loading={props.loading}
        />
        <ChampionBuildLine
          label={t("champions.boots")}
          build={props.detail?.boots[0]}
          icon={props.itemIcon}
          loading={props.loading}
        />
        <Index each={[0, 1]}>
          {(_, index) => (
            <ChampionBuildLine
              label={
                index === 0
                  ? t("champions.core")
                  : t("champions.buildAlternative", {
                      number: String(index + 1),
                    })
              }
              build={props.detail?.coreItems[index]}
              icon={props.itemIcon}
              loading={props.loading}
            />
          )}
        </Index>
      </div>
      <div
        ref={situationalLayout.ref}
        class={s.situationalRow}
        style={situationalLayout.style()}
      >
        <Show
          when={!props.loading}
          fallback={<span class={s.buildRowSkeleton} aria-hidden="true" />}
        >
          <h3 class={`${shared.sectionLabel} ${s.buildLabel}`}>
            {t("champions.situational")}
          </h3>
          <div class={s.icons}>
            <Show
              when={props.detail?.lastItems.length}
              fallback={<span class={shared.muted}>—</span>}
            >
              <Index each={props.detail?.lastItems ?? []}>
                {(build) => (
                  <ItemIcon src={props.itemIcon(build().ids[0] ?? 0)} />
                )}
              </Index>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
