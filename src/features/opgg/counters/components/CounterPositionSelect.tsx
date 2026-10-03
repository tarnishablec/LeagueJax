/** @jsxImportSource solid-js */
import { createMemo } from "solid-js";
import { AppTooltip } from "@/components/AppTooltip";
import { LeaguePositionIcon } from "@/components/league-position/LeaguePositionIcon";
import { createListCollection, SettingsSelect } from "@/components/settings-ui";
import { useSolidTranslation } from "@/i18n/solid";
import { gameColorVars } from "@/styles/game-colors.css";
import { CHAMPION_POSITIONS } from "../../model";
import { type CounterPositionChoice, isCounterPosition } from "../model";
import * as s from "./CounterPositionSelect.css";

// The tooltip lives inside the select trigger so the two Ark primitives do not
// overwrite each other's data-state or keyboard handlers.
export function CounterPositionSelect(props: {
  cellId: number;
  value: CounterPositionChoice;
  resolvedPosition: string | null;
  onValueChange: (value: CounterPositionChoice) => void;
}) {
  const { t } = useSolidTranslation();
  const collection = createMemo(() =>
    createListCollection({
      items: [
        { value: "auto", label: t("counters.autoSelection") },
        ...CHAMPION_POSITIONS.map((value) => ({
          value: String(value),
          label: t(`counters.positions.${value}`),
        })),
      ],
    }),
  );
  return (
    <SettingsSelect
      ariaLabel={`Select counter position for enemy slot ${props.cellId}`}
      size="sm"
      width={28}
      collection={collection()}
      value={[props.value]}
      triggerIcon={
        <AppTooltip
          content={t(
            props.value === "auto"
              ? "counters.autoSelection"
              : `counters.positions.${props.value}`,
          )}
          placement="bottom-end"
        >
          {(triggerProps) => (
            <span {...triggerProps<HTMLSpanElement>({ class: s.icon })}>
              <LeaguePositionIcon
                position={
                  props.value === "auto"
                    ? (props.resolvedPosition ?? "NONE")
                    : props.value
                }
                width={18}
                height={18}
                color={
                  props.value === "auto" ? gameColorVars.team.blue : undefined
                }
              />
            </span>
          )}
        </AppTooltip>
      }
      positioning={{ sameWidth: false, placement: "bottom-end" }}
      onValueChange={({ value }) => {
        const next = value[0];
        if (next === "auto" || (next && isCounterPosition(next)))
          props.onValueChange(next);
      }}
    />
  );
}
