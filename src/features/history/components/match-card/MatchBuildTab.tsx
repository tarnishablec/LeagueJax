import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  RawMatchDetailsGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import { useCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import {
  type MatchBuildItemPurchase,
  type MatchBuildSkillStep,
  resolveParticipantBuildTimeline,
} from "../../hooks/match-build-timeline";
import * as s from "./MatchBuildTab.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";

function SkillBuildSection({
  skills,
}: {
  skills: readonly MatchBuildSkillStep[];
}) {
  const { t } = useTranslation();

  return (
    <section className={s.section}>
      <header className={s.sectionHeader}>
        {t("history.matchBuild.skillOrder", {
          defaultValue: "Skill order",
        })}
      </header>
      {skills.length > 0 ? (
        <div className={s.skillGrid}>
          {skills.map((step) => (
            <span
              key={`${step.level}-${step.skillKey}-${step.timestamp ?? "unknown"}`}
              className={s.skillStep}
            >
              <span className={s.skillBadge({ skill: step.skillKey })}>
                <span className={s.skillKey}>{step.skillKey}</span>
                <span className={s.skillLevel}>{step.level}</span>
              </span>
              <span className={s.stepTime}>{step.timeLabel}</span>
            </span>
          ))}
        </div>
      ) : (
        <span className={s.inlineEmpty}>
          {t("history.matchBuild.noSkillData", {
            defaultValue: "No skill order data",
          })}
        </span>
      )}
    </section>
  );
}

function ItemBuildSection({
  items,
}: {
  items: readonly MatchBuildItemPurchase[];
}) {
  const { t } = useTranslation();
  const itemRows = useMemo(() => {
    const seenKeys = new Map<string, number>();

    return items.map((purchase) => {
      const baseKey = `${purchase.itemId}-${purchase.timestamp ?? "unknown"}`;
      const seenCount = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, seenCount + 1);

      return {
        key: seenCount === 0 ? baseKey : `${baseKey}-${seenCount}`,
        purchase,
      };
    });
  }, [items]);
  const itemParams = useMemo(
    () =>
      itemRows.map(({ purchase }) => ({
        type: "item" as const,
        itemId: purchase.itemId,
      })),
    [itemRows],
  );
  const itemAssets = useCdragonStaticData(itemParams);

  return (
    <section className={s.section}>
      <header className={s.sectionHeader}>
        {t("history.matchBuild.itemPurchases", {
          defaultValue: "Item purchases",
        })}
      </header>
      {items.length > 0 ? (
        <div className={s.itemGrid}>
          {itemRows.map(({ key, purchase }, index) => {
            const itemAsset = itemAssets[index];

            return (
              <span key={key} className={s.itemStep}>
                <MatchCardAssetIcon
                  src={itemAsset?.src ?? null}
                  alt={t("history.match.itemAlt", {
                    id: purchase.itemId,
                    defaultValue: `Item ${purchase.itemId}`,
                  })}
                  className={s.itemIcon}
                  fallbackClassName={s.itemIconFallback}
                />
                <span className={s.stepTime}>{purchase.timeLabel}</span>
              </span>
            );
          })}
        </div>
      ) : (
        <span className={s.inlineEmpty}>
          {t("history.matchBuild.noItemData", {
            defaultValue: "No item purchase data",
          })}
        </span>
      )}
    </section>
  );
}

function SelectedParticipantBuild({
  detail,
  detailLoading,
  participant,
}: {
  detail: RawMatchDetailsGame | undefined;
  detailLoading: boolean;
  participant: RawMatchSummaryParticipant;
}) {
  const { t } = useTranslation();
  const timeline = useMemo(
    () => resolveParticipantBuildTimeline(detail, participant.participantId),
    [detail, participant.participantId],
  );

  if (!detail) {
    return (
      <span className={s.emptyState}>
        {detailLoading
          ? t("history.matchBuild.loading", {
              defaultValue: "Loading build data...",
            })
          : t("history.matchBuild.noData", {
              defaultValue: "No build data",
            })}
      </span>
    );
  }

  return (
    <div className={s.sectionGrid}>
      <SkillBuildSection skills={timeline.skillOrder} />
      <ItemBuildSection items={timeline.itemPurchases} />
    </div>
  );
}

export function MatchBuildTab({
  detail,
  detailLoading,
  participant,
}: {
  detail: RawMatchDetailsGame | undefined;
  detailLoading: boolean;
  participant: RawMatchSummaryParticipant;
}) {
  return (
    <SelectedParticipantBuild
      detail={detail}
      detailLoading={detailLoading}
      participant={participant}
    />
  );
}
