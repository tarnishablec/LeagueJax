import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { useTranslation } from "react-i18next";
import type {
  MatchPill,
  MatchTag,
} from "../../hooks/use-match-card-view-model";
import * as s from "./MatchCardPills.css";

const TAG_I18N_KEYS: Record<MatchTag, string> = {
  penta: "history.tag.penta",
  quadra: "history.tag.quadra",
  triple: "history.tag.triple",
  firstBlood: "history.tag.firstBlood",
  highestDamage: "history.tag.highestDamage",
  mostTurretDamage: "history.tag.mostTurretDamage",
  mostDamageTaken: "history.tag.mostDamageTaken",
  mostHealing: "history.tag.mostHealing",
  bestVision: "history.tag.bestVision",
  mostCC: "history.tag.mostCC",
  mostCS: "history.tag.mostCS",
  highestKP: "history.tag.highestKP",
  mostGold: "history.tag.mostGold",
  bestDamageEfficiency: "history.tag.bestDamageEfficiency",
  mvp: "history.tag.mvp",
  ace: "history.tag.ace",
};

const TAG_DESC_KEYS: Record<MatchTag, string> = {
  penta: "history.tag.penta.desc",
  quadra: "history.tag.quadra.desc",
  triple: "history.tag.triple.desc",
  firstBlood: "history.tag.firstBlood.desc",
  highestDamage: "history.tag.highestDamage.desc",
  mostTurretDamage: "history.tag.mostTurretDamage.desc",
  mostDamageTaken: "history.tag.mostDamageTaken.desc",
  mostHealing: "history.tag.mostHealing.desc",
  bestVision: "history.tag.bestVision.desc",
  mostCC: "history.tag.mostCC.desc",
  mostCS: "history.tag.mostCS.desc",
  highestKP: "history.tag.highestKP.desc",
  mostGold: "history.tag.mostGold.desc",
  bestDamageEfficiency: "history.tag.bestDamageEfficiency.desc",
  mvp: "history.tag.mvp.desc",
  ace: "history.tag.ace.desc",
};

export function MatchCardPills({
  pills,
  className,
}: {
  pills: MatchPill[];
  className?: string;
}) {
  const { t } = useTranslation();

  if (pills.length === 0) return null;

  return (
    <div className={className ? `${s.root} ${className}` : s.root}>
      {pills.map((pill) => {
        const isSoloKill = pill.type === "soloKill";
        const key = isSoloKill ? `soloKill-${pill.count}` : pill.tag;
        const label = isSoloKill
          ? t("history.tag.soloKill.label", {
              defaultValue: "SoloKill",
            })
          : t(TAG_I18N_KEYS[pill.tag]);
        const description = isSoloKill
          ? t("history.tag.soloKill.desc", {
              count: pill.count,
              defaultValue: `Recorded ${pill.count} solo kills this game`,
            })
          : t(TAG_DESC_KEYS[pill.tag]);
        const tagStyle = isSoloKill ? "soloKill" : pill.tag;

        return (
          <Tooltip.Root key={key} openDelay={200} closeDelay={0}>
            <Tooltip.Trigger asChild>
              <span className={s.tagPill({ tag: tagStyle })}>
                {isSoloKill ? (
                  <span className={s.soloKillContent}>
                    <span>{label}</span>
                    <span className={s.soloKillCount}>
                      <span className={s.soloKillMultiply}>×</span>
                      <span className={s.soloKillNumber}>{pill.count}</span>
                    </span>
                  </span>
                ) : (
                  label
                )}
              </span>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner className={s.tooltipPositioner}>
                <Tooltip.Content className={s.tooltipContent}>
                  {description}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>
        );
      })}
    </div>
  );
}
