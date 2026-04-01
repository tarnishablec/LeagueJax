import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { useTranslation } from "react-i18next";
import type { MatchTag } from "../../hooks/use-match-card-view-model";
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
  tags,
  className,
}: {
  tags: MatchTag[];
  className?: string;
}) {
  const { t } = useTranslation();

  if (tags.length === 0) return null;

  return (
    <div className={className ? `${s.root} ${className}` : s.root}>
      {tags.map((tag) => (
        <Tooltip.Root key={tag} openDelay={200} closeDelay={0}>
          <Tooltip.Trigger asChild>
            <span className={s.tagPill({ tag })}>{t(TAG_I18N_KEYS[tag])}</span>
          </Tooltip.Trigger>
          <Portal>
            <Tooltip.Positioner className={s.tooltipPositioner}>
              <Tooltip.Content className={s.tooltipContent}>
                {t(TAG_DESC_KEYS[tag])}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      ))}
    </div>
  );
}
