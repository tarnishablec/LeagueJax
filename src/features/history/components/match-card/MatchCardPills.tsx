/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useSolidTranslation } from "@/i18n/solid";
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
  mostShielding: "history.tag.mostShielding",
  bestVision: "history.tag.bestVision",
  mostWardsKilled: "history.tag.mostWardsKilled",
  mostWardsPlaced: "history.tag.mostWardsPlaced",
  epicSteal: "history.tag.epicSteal",
  junglePressure: "history.tag.junglePressure",
  survivor: "history.tag.survivor",
  mostMitigated: "history.tag.mostMitigated",
  mostCC: "history.tag.mostCC",
  mostCS: "history.tag.mostCS",
  mostAssists: "history.tag.mostAssists",
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
  mostShielding: "history.tag.mostShielding.desc",
  bestVision: "history.tag.bestVision.desc",
  mostWardsKilled: "history.tag.mostWardsKilled.desc",
  mostWardsPlaced: "history.tag.mostWardsPlaced.desc",
  epicSteal: "history.tag.epicSteal.desc",
  junglePressure: "history.tag.junglePressure.desc",
  survivor: "history.tag.survivor.desc",
  mostMitigated: "history.tag.mostMitigated.desc",
  mostCC: "history.tag.mostCC.desc",
  mostCS: "history.tag.mostCS.desc",
  mostAssists: "history.tag.mostAssists.desc",
  highestKP: "history.tag.highestKP.desc",
  mostGold: "history.tag.mostGold.desc",
  bestDamageEfficiency: "history.tag.bestDamageEfficiency.desc",
  mvp: "history.tag.mvp.desc",
  ace: "history.tag.ace.desc",
};

export function MatchCardPills(props: {
  pills: MatchPill[];
  className?: string;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const rootClass = () =>
    props.className ? `${s.root} ${props.className}` : s.root;
  const pillItems = keyArray(
    () => props.pills,
    (pill) => (pill.type === "soloKill" ? "soloKill" : pill.tag),
    (pill) => {
      const isSoloKill = () => pill().type === "soloKill";
      const label = () => {
        const current = pill();
        return current.type === "soloKill"
          ? t("history.tag.soloKill.label", {
              defaultValue: "SoloKill",
            })
          : t(TAG_I18N_KEYS[current.tag]);
      };
      const description = () => {
        const current = pill();
        return current.type === "soloKill"
          ? t("history.tag.soloKill.desc", {
              count: current.count,
              defaultValue: `Recorded ${current.count} solo kills this game`,
            })
          : t(TAG_DESC_KEYS[current.tag]);
      };
      const tagStyle = () => {
        const current = pill();
        return current.type === "soloKill" ? "soloKill" : current.tag;
      };
      const soloKillCount = () => {
        const current = pill();
        return current.type === "soloKill" ? current.count : null;
      };

      return (
        <Tooltip.Root openDelay={200} closeDelay={0}>
          <Tooltip.Trigger
            asChild={(getTriggerProps) => (
              <span
                {...getTriggerProps({
                  class: s.tagPill({ tag: tagStyle() }),
                })}
              >
                <Show when={isSoloKill()} fallback={label()}>
                  <span class={s.soloKillContent}>
                    <span>{label()}</span>
                    <span class={s.soloKillCount}>
                      <span class={s.soloKillMultiply}>×</span>
                      <span class={s.soloKillNumber}>{soloKillCount()}</span>
                    </span>
                  </span>
                </Show>
              </span>
            )}
          />
          <Portal>
            <Tooltip.Positioner class={s.tooltipPositioner}>
              <Tooltip.Content class={s.tooltipContent}>
                {description()}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      );
    },
  );

  return (
    <Show when={props.pills.length > 0}>
      <div class={rootClass()}>{pillItems()}</div>
    </Show>
  );
}
