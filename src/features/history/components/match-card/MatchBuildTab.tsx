/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import type {
  RawMatchDetailsGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import { useSolidCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { useSolidTranslation } from "@/i18n/solid";
import {
  type MatchBuildItemPurchase,
  type MatchBuildSkillStep,
  resolveParticipantBuildTimeline,
} from "../../hooks/match-build-timeline";
import * as s from "./MatchBuildTab.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";

function SkillBuildSection(props: {
  skills: readonly MatchBuildSkillStep[];
}): JSX.Element {
  const { t } = useSolidTranslation();
  const skillSteps = keyArray(
    () => props.skills,
    (step) => `${step.level}-${step.skillKey}-${step.timeLabel}`,
    (step) => (
      <span class={s.skillStep}>
        <span class={s.skillBadge({ skill: step().skillKey })}>
          <span class={s.skillKey}>{step().skillKey}</span>
          <span class={s.skillLevel}>{step().level}</span>
        </span>
        <span class={s.stepTime}>{step().timeLabel}</span>
      </span>
    ),
  );

  return (
    <section class={s.section}>
      <header class={s.sectionHeader}>
        {t("history.matchBuild.skillOrder", {
          defaultValue: "Skill order",
        })}
      </header>
      <Show
        when={props.skills.length > 0}
        fallback={
          <span class={s.inlineEmpty}>
            {t("history.matchBuild.noSkillData", {
              defaultValue: "No skill order data",
            })}
          </span>
        }
      >
        <div class={s.skillGrid}>{skillSteps()}</div>
      </Show>
    </section>
  );
}

function ItemBuildSection(props: {
  items: readonly MatchBuildItemPurchase[];
}): JSX.Element {
  const { t } = useSolidTranslation();
  const itemRows = createMemo(() => {
    const seenKeys = new Map<string, number>();

    return props.items.map((purchase) => {
      const baseKey = `${purchase.itemId}-${purchase.timestamp ?? "unknown"}`;
      const seenCount = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, seenCount + 1);

      return {
        key: seenCount === 0 ? baseKey : `${baseKey}-${seenCount}`,
        purchase,
      };
    });
  });
  const itemParams = createMemo(() =>
    itemRows().map(({ purchase }) => ({
      type: "item" as const,
      itemId: purchase.itemId,
    })),
  );
  const itemAssets = useSolidCdragonStaticData(itemParams());
  const purchaseItems = keyArray(
    itemRows,
    ({ key }) => key,
    (row, index) => {
      const itemAsset = () => itemAssets()[index()];
      return (
        <span class={s.itemStep}>
          <MatchCardAssetIcon
            src={itemAsset()?.src ?? null}
            alt={t("history.match.itemAlt", {
              id: row().purchase.itemId,
              defaultValue: `Item ${row().purchase.itemId}`,
            })}
            className={s.itemIcon}
            fallbackClassName={s.itemIconFallback}
          />
          <span class={s.stepTime}>{row().purchase.timeLabel}</span>
        </span>
      );
    },
  );

  return (
    <section class={s.section}>
      <header class={s.sectionHeader}>
        {t("history.matchBuild.itemPurchases", {
          defaultValue: "Item purchases",
        })}
      </header>
      <Show
        when={props.items.length > 0}
        fallback={
          <span class={s.inlineEmpty}>
            {t("history.matchBuild.noItemData", {
              defaultValue: "No item purchase data",
            })}
          </span>
        }
      >
        <div class={s.itemGrid}>{purchaseItems()}</div>
      </Show>
    </section>
  );
}

function SelectedParticipantBuild(props: {
  detail: RawMatchDetailsGame | undefined;
  detailLoading: boolean;
  participant: RawMatchSummaryParticipant;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const timeline = createMemo(() =>
    resolveParticipantBuildTimeline(
      props.detail,
      props.participant.participantId,
    ),
  );

  return (
    <Show
      when={props.detail}
      fallback={
        <span class={s.emptyState}>
          {props.detailLoading
            ? t("history.matchBuild.loading", {
                defaultValue: "Loading build data...",
              })
            : t("history.matchBuild.noData", {
                defaultValue: "No build data",
              })}
        </span>
      }
    >
      <div class={s.sectionGrid}>
        <SkillBuildSection skills={timeline().skillOrder} />
        <ItemBuildSection items={timeline().itemPurchases} />
      </div>
    </Show>
  );
}

export function MatchBuildTab(props: {
  detail: RawMatchDetailsGame | undefined;
  detailLoading: boolean;
  participant: RawMatchSummaryParticipant;
}): JSX.Element {
  return (
    <SelectedParticipantBuild
      detail={props.detail}
      detailLoading={props.detailLoading}
      participant={props.participant}
    />
  );
}
